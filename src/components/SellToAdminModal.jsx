"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
export default function SellToAdminModal({ isOpen, onClose, car, buybackPrice, onConfirmSale }) {
    const wallets = [];
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isApproved, setIsApproved] = useState(false);
    const [checkingApproval, setCheckingApproval] = useState(false);
    const [approvingNFT, setApprovingNFT] = useState(false);

    // Check if NFT is already approved
    useEffect(() => {
        if (isOpen && car && wallets.length > 0) {
            checkApprovalStatus();
        }
    }, [isOpen, car, wallets]);

    const checkApprovalStatus = async () => {
        try {
            setCheckingApproval(true);

            // Get first wallet (embedded or external)
            const wallet = wallets[0];
            if (!wallet) {
                setIsApproved(false);
                return;
            }

            const ethereumProvider = await wallet.getEthereumProvider();
            const provider = new ethers.BrowserProvider(ethereumProvider);
            const contract = new ethers.Contract(CAR_CONTRACT_ADDRESS, CAR_CONTRACT_ABI, provider);

            const approved = await contract.getApproved(car.tokenId);
            const approvedForAll = await contract.isApprovedForAll(wallet.address, BACKEND_WALLET_ADDRESS);

            setIsApproved(
                approved.toLowerCase() === BACKEND_WALLET_ADDRESS.toLowerCase() || approvedForAll
            );
        } catch (err) {
            console.error("Failed to check approval:", err);
            setIsApproved(false);
        } finally {
            setCheckingApproval(false);
        }
    };

    const handleApprove = async () => {
        setApprovingNFT(true);
        setError(null);

        try {
            // Get first wallet
            const wallet = wallets[0];
            if (!wallet) {
                throw new Error("No wallet connected");
            }

            const ethereumProvider = await wallet.getEthereumProvider();
            const provider = new ethers.BrowserProvider(ethereumProvider);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CAR_CONTRACT_ADDRESS, CAR_CONTRACT_ABI, signer);

            const tx = await contract.approve(BACKEND_WALLET_ADDRESS, car.tokenId);
            await tx.wait();

            setIsApproved(true);
        } catch (err) {
            console.error("Approval error:", err);
            setError(err.message || "Failed to approve NFT");
        } finally {
            setApprovingNFT(false);
        }
    };

    const handleConfirm = async () => {
        if (!isApproved) {
            setError("Please approve the NFT first");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await onConfirmSale(car.tokenId);
            // Parent will close modal after successful sale
        } catch (err) {
            setError(err.message || "Failed to sell car");
            setIsLoading(false);
        }
    };

    // Early return AFTER all hooks
    if (!isOpen || !car) return null;

    // Rarity colors
    const rarityColors = {
        common: "from-gray-600 to-gray-700",
        rare: "from-blue-600 to-blue-700",
        epic: "from-purple-600 to-purple-700",
        legendary: "from-yellow-600 to-orange-600"
    };

    const gradientClass = rarityColors[car.rarity?.toLowerCase()] || rarityColors.common;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-orange-500 rounded-2xl p-6 max-w-md w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black text-white">SELL TO ADMIN</h2>
                    <button
                        onClick={onClose}
                        disabled={isLoading || approvingNFT}
                        className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Car Image */}
                <div className="relative h-40 mb-4 flex items-center justify-center bg-gray-800 rounded-xl">
                    <img
                        src={car.imageUrl || car.image || `/assets/car/${car.modelName}.png`}
                        alt={car.modelName}
                        className="max-h-full max-w-full object-contain drop-shadow-2xl"
                        onError={(e) => {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23333' width='200' height='150'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='16'%3ECar%3C/text%3E%3C/svg%3E";
                        }}
                    />
                </div>

                {/* Car Details */}
                <div className="bg-black/30 rounded-xl p-4 mb-4">
                    <h3 className="text-white font-black text-lg mb-2">{car.modelName}</h3>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400 text-sm">Series:</span>
                        <span className="text-white text-sm font-bold">{car.series}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Rarity:</span>
                        <span className={`bg-gradient-to-r ${gradientClass} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>
                            {car.rarity}
                        </span>
                    </div>
                </div>

                {/* Buyback Price */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 mb-4">
                    <p className="text-white/80 text-sm font-bold mb-1">YOU WILL RECEIVE</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-white text-4xl font-black">{buybackPrice.toLocaleString()}</span>
                        <span className="text-white/90 text-lg font-bold">IDRX</span>
                    </div>
                </div>

                {/* Approval Status */}
                {checkingApproval ? (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                        <p className="text-blue-400 text-sm font-bold">Checking approval status...</p>
                    </div>
                ) : !isApproved ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2 mb-2">
                            <Shield size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                            <p className="text-yellow-400 text-xs font-bold">
                                Step 1: You need to approve this NFT for sale
                            </p>
                        </div>
                        <button
                            onClick={handleApprove}
                            disabled={approvingNFT}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {approvingNFT ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                                    <span>APPROVING...</span>
                                </>
                            ) : (
                                <>
                                    <Shield size={16} />
                                    <span>APPROVE NFT</span>
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-green-400" />
                        <p className="text-green-400 text-sm font-bold">NFT approved! Ready to sell.</p>
                    </div>
                )}

                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-400 text-xs font-bold">
                        This action is permanent. The NFT will be transferred to admin and you will receive IDRX instantly.
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                        <p className="text-red-400 text-sm font-bold">{error}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading || approvingNFT}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-black py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading || approvingNFT || !isApproved}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>SELLING...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={20} />
                                <span>CONFIRM SALE</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
