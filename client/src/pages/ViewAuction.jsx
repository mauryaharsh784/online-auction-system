import { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { useViewAuction, usePlaceBid } from "../hooks/useAuction.js";
import { useSocket } from "../hooks/useSocket.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import toast from "react-hot-toast";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const ViewAuction = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const currentUserId = user?.user?._id;
  const inputRef = useRef();
  const [bidding, setBidding] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0,
  });

  const { data: fetchedData, isLoading } = useViewAuction(id);
  const { mutateAsync: placeBidMutation } = usePlaceBid();
  const { activeUsers, liveAuction, socketError, isConnected } = useSocket(id, currentUserId);

  const data = liveAuction || fetchedData;
  useDocumentTitle(data?.itemName ? data.itemName : "Auction Details");

  // ✅ Auction Context for AI Chatbot
  useEffect(() => {
    if (data) {
      window.__auctionContext = {
        itemName: data.itemName,
        itemCategory: data.itemCategory,
        itemDescription: data.itemDescription,
        startingPrice: data.startingPrice,
        currentPrice: data.currentPrice,
        totalBids: data.bids?.length || 0,
        timeLeft: timeLeft > 0 ? `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m` : "Ended",
        isActive: timeLeft > 0,
      };
    }
    return () => { window.__auctionContext = null; };
  }, [data, countdown]);

  useEffect(() => {
    if (!data?.itemEndDate) return;
    const updateCountdown = () => {
      const diff = Math.max(0, new Date(data.itemEndDate) - new Date());
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [data?.itemEndDate]);

  if (isLoading || !data) return <LoadingScreen />;

  const timeLeft = Math.max(0, new Date(data.itemEndDate) - new Date());
  const isActive = timeLeft > 0;
  const isSeller = data.seller._id === currentUserId;
  const winnerData = data.winner;
  const isWinner = winnerData?._id === currentUserId;
  const otherUsers = activeUsers.filter((u) => u.userId !== currentUserId);

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    const bidAmount = e.target.bidAmount.value.trim();
    if (!bidAmount) return;
    setBidding(true);
    try {
      await placeBidMutation({ bidAmount: Number(bidAmount), id });
      toast.success("Bid placed successfully!");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to place bid";
      toast.error(msg);
    } finally {
      setBidding(false);
    }
  };

  // ✅ Voice Bidding
  const startVoiceBid = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Aapka browser voice bidding support nahi karta!");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast("🎤 Boliye... jaise 'Bid 500 rupees'", { icon: "🎙️" });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const numbers = transcript.match(/\d+/);
      const words = {
        "ek sau": 100, "do sau": 200, "teen sau": 300,
        "char sau": 400, "paanch sau": 500, "chhe sau": 600,
        "saat sau": 700, "aath sau": 800, "nau sau": 900,
        "ek hazaar": 1000,
      };
      let amount = null;
      for (const [word, val] of Object.entries(words)) {
        if (transcript.includes(word)) { amount = val; break; }
      }
      if (!amount && numbers) amount = parseInt(numbers[0]);
      if (amount) {
        if (inputRef.current) inputRef.current.value = amount;
        toast.success(`🎤 Amount set: Rs ${amount}`);
      } else {
        toast.error("Amount samajh nahi aaya. Dobara try karo!");
      }
    };

    recognition.onerror = () => { setIsListening(false); toast.error("Voice recognition failed!"); };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) { toast.error("Razorpay failed to load."); return; }
      const res = await fetch(`${import.meta.env.VITE_API}/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: data.currentPrice }),
      });
      const order = await res.json();
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Auction Payment",
        description: `Payment for ${data.itemName}`,
        order_id: order.id,
        handler: async function (response) {
          const verifyRes = await fetch(`${import.meta.env.VITE_API}/payment/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) toast.success("🎉 Payment Successful!");
          else toast.error("Payment verification failed!");
        },
        prefill: { name: user?.user?.name || "", email: user?.user?.email || "" },
        theme: { color: "#4f46e5" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error("Payment failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const avatarColors = [
    "bg-indigo-100 text-indigo-600", "bg-rose-100 text-rose-600",
    "bg-amber-100 text-amber-700", "bg-teal-100 text-teal-600",
    "bg-violet-100 text-violet-600", "bg-sky-100 text-sky-600",
  ];
  const getAvatarColor = (name) => {
    const hash = (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return avatarColors[hash % avatarColors.length];
  };

  const BidHistoryList = () =>
    data.bids.length === 0 ? (
      <div className="py-10 text-center">
        <p className="text-gray-400 text-sm">No bids yet</p>
        <p className="text-gray-300 text-xs mt-1">Be the first to place a bid!</p>
      </div>
    ) : (
      <div className="space-y-2">
        {data.bids.map((bid, index) => (
          <div key={index} className={`flex items-center justify-between p-3 rounded-xl transition ${index === 0 ? "bg-indigo-50 border border-indigo-100" : "hover:bg-gray-50"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColor(bid.bidder?.name)}`}>
                {bid.bidder?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {bid.bidder?.name}
                  {index === 0 && <span className="ml-2 text-[10px] font-semibold uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">Leading</span>}
                </p>
                <p className="text-xs text-gray-400">{new Date(bid.bidTime).toLocaleString()}</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-gray-700 tabular-nums">Rs {bid.bidAmount}</span>
          </div>
        ))}
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <button
          onClick={() => { if (document.startViewTransition) { document.startViewTransition(() => navigate(-1)); } else { navigate(-1); } }}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition mb-6 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="sticky top-6 space-y-6">
              <div className="relative group">
                <div className="aspect-[4/3] bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm">
                  <img src={data.itemImage?.url || "https://picsum.photos/601"} alt={data.itemName} className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                </div>
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className={`text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm ${isActive ? "bg-emerald-500/90 text-white" : "bg-gray-800/80 text-white"}`}>
                    {isActive ? "Live Auction" : "Ended"}
                  </span>
                  {isConnected && isActive && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-white bg-gray-900/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      {activeUsers.length} watching
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Bid History</h3>
                <BidHistoryList />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">{data.itemCategory}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{data.itemName}</h1>
              <p className="mt-3 text-gray-500 text-[15px] leading-relaxed">{data.itemDescription}</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Current Bid</p>
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900 mt-1 tabular-nums">Rs {data.currentPrice}</p>
                    <p className="text-xs text-gray-400 mt-1">Started at Rs {data.startingPrice}</p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {data.bids.length} bid{data.bids.length !== 1 && "s"}
                  </div>
                </div>
              </div>
              {isActive ? (
                <div className="bg-red-50 border-t border-red-100 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600 font-medium">⏱ Time remaining</span>
                    <div className="flex items-center gap-1.5">
                      {countdown.days > 0 && <span className="bg-red-100 text-red-700 text-sm font-bold px-2 py-0.5 rounded-md">{countdown.days}d</span>}
                      <span className="bg-red-100 text-red-700 text-sm font-bold px-2 py-0.5 rounded-md">{String(countdown.hours).padStart(2, "0")}h</span>
                      <span className="bg-red-100 text-red-700 text-sm font-bold px-2 py-0.5 rounded-md">{String(countdown.minutes).padStart(2, "0")}m</span>
                      <span className="bg-red-100 text-red-700 text-sm font-bold px-2 py-0.5 rounded-md">{String(countdown.seconds).padStart(2, "0")}s</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 border-t border-gray-200 px-6 py-4 text-center">
                  <p className="text-sm font-medium text-gray-500">Auction ended</p>
                </div>
              )}
            </div>

            {!isActive && winnerData && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-amber-100 p-2 rounded-xl">🏆</div>
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Winner</p>
                    <p className="text-lg font-bold text-gray-900">{winnerData.name}</p>
                  </div>
                </div>
                <p className="text-sm text-amber-700">Won with a bid of <span className="font-bold">Rs {data.currentPrice}</span></p>
                {isWinner && (
                  <div className="mt-4">
                    <div className="bg-amber-100 text-amber-800 text-sm font-medium px-4 py-2 rounded-xl mb-3">
                      🎉 Congratulations! You won this auction!
                    </div>
                    <button
                      onClick={handlePayment}
                      disabled={paymentLoading}
                      className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all ${paymentLoading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97] shadow-sm shadow-indigo-200"}`}
                    >
                      {paymentLoading ? "Processing..." : `💳 Pay Now — Rs ${data.currentPrice}`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isActive && !winnerData && data.bids.length === 0 && (
              <div className="bg-gray-100 rounded-2xl border border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-500">This auction ended with no bids.</p>
              </div>
            )}

            {/* ✅ Bid Form with Voice Button */}
            {!isSeller && isActive && (
              <form onSubmit={handleBidSubmit} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="bidAmount" className="text-sm font-semibold text-gray-700">Place your bid</label>
                  <span className="text-xs text-gray-400">Rs {data.currentPrice + 1} — {data.currentPrice + 10}</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs</span>
                    <input
                      type="number"
                      name="bidAmount"
                      id="bidAmount"
                      ref={inputRef}
                      min={data.currentPrice + 1}
                      max={data.currentPrice + 10}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold text-lg tabular-nums placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition"
                      placeholder={String(data.currentPrice + 1)}
                      required
                    />
                  </div>
                  <button type="submit" disabled={bidding} className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all ${bidding ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97] shadow-sm shadow-indigo-200"}`}>
                    {bidding ? "Bidding..." : "Bid Now"}
                  </button>
                  {/* ✅ Voice Button */}
                  <button
                    type="button"
                    onClick={startVoiceBid}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    title="Voice Bid"
                  >
                    {isListening ? "🔴" : "🎤"}
                  </button>
                </div>
              </form>
            )}

            {socketError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{socketError}</div>
            )}

            {otherUsers.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Also watching</h3>
                <div className="flex flex-wrap gap-2">
                  {otherUsers.map((u) => (
                    <div key={u.userId} className="flex items-center gap-2 bg-gray-50 pl-1.5 pr-3 py-1 rounded-full">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getAvatarColor(u.userName)}`}>
                        {u.userName?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-600">{u.userName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Seller</h3>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(data.seller.name)}`}>
                  {data.seller.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{data.seller.name}</p>
                  <p className="text-xs text-gray-400">Auction creator</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 lg:hidden bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Bid History</h3>
          <BidHistoryList />
        </div>
      </div>
    </div>
  );
};