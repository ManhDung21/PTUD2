import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Edit2, Check, X, Tag } from 'lucide-react';
import clsx from 'clsx';

interface Plan {
    id: string;
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    color: string;
    original_price?: string;
    badge?: string;
    buttonText: string;
    amount_vnd: number;
}

interface AdminPlansProps {
    isDarkMode: boolean;
    showToast: (type: "success" | "error", message: string) => void;
}

export function AdminPlans({ isDarkMode, showToast }: AdminPlansProps) {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Plan>>({});

    useEffect(() => {
        fetchPlans();
    }, []);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans`);
            setPlans(res.data);
        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message);
            showToast("error", "Lỗi tải quản lý gói");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (plan: Plan) => {
        setEditingPlanId(plan.id);
        setEditForm(plan);
    };

    const handleCancelEdit = () => {
        setEditingPlanId(null);
        setEditForm({});
    };

    const handleSave = async (id: string) => {
        try {
            const token = localStorage.getItem("token");
            await axios.put(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans/${id}`,
                editForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast("success", "Đã cập nhật gói thành công");
            setEditingPlanId(null);
            fetchPlans();
        } catch (error) {
            console.error(error);
            showToast("error", "Lỗi cập nhật gói");
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Đang tải cấu hình gói...</div>;
    }

    return (
        <motion.div
            key="plans"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
        >
            <div className="p-6 border-b border-panel-border flex justify-between items-center bg-panel">
                <div className="flex items-center gap-4">
                    <h2 className={clsx("text-lg font-bold flex items-center gap-2", isDarkMode ? "text-white" : "text-gray-900")}>
                        <Tag size={18} className="text-yellow-500" />
                        Quản Lý Gói Dịch Vụ
                    </h2>
                </div>
            </div>

            {errorMsg && (
                <div className="p-4 m-6 bg-red-100 border border-red-400 text-red-700 rounded-lg whitespace-pre-wrap">
                    <h3 className="font-bold border-b border-red-200 pb-2 mb-2">Error Loading Plans</h3>
                    <p>{errorMsg}</p>
                    <p className="mt-2 text-xs opacity-70">URL was: {process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans</p>
                </div>
            )}
            
            <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        className={clsx(
                            "border rounded-2xl p-6 relative overflow-hidden transition-all",
                            isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200 shadow-sm"
                        )}
                    >
                        {editingPlanId === plan.id ? (
                            <div className="space-y-4">
                                <div>
                                    <label className={clsx("block text-xs font-medium mb-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Tên gói</label>
                                    <input 
                                        type="text" 
                                        className={clsx("w-full px-3 py-2 text-sm rounded-lg border", isDarkMode ? "bg-black/50 border-white/10 text-white" : "bg-white border-gray-300")} 
                                        value={editForm.name || ""} 
                                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className={clsx("block text-xs font-medium mb-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Giá Đang Bán</label>
                                        <input 
                                            type="text" 
                                            className={clsx("w-full px-3 py-2 text-sm rounded-lg border", isDarkMode ? "bg-black/50 border-white/10 text-white" : "bg-white border-gray-300")} 
                                            value={editForm.price || ""} 
                                            onChange={e => setEditForm({...editForm, price: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className={clsx("block text-xs font-medium mb-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Giá Gốc (Gạch ngang)</label>
                                        <input 
                                            type="text" 
                                            className={clsx("w-full px-3 py-2 text-sm rounded-lg border", isDarkMode ? "bg-black/50 border-white/10 text-white" : "bg-white border-gray-300")} 
                                            value={editForm.original_price || ""} 
                                            onChange={e => setEditForm({...editForm, original_price: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={clsx("block text-xs font-medium mb-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Chu kỳ hiển thị</label>
                                    <input 
                                        type="text" 
                                        className={clsx("w-full px-3 py-2 text-sm rounded-lg border", isDarkMode ? "bg-black/50 border-white/10 text-white" : "bg-white border-gray-300")} 
                                        value={editForm.period || ""} 
                                        onChange={e => setEditForm({...editForm, period: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className={clsx("block text-xs font-medium mb-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Giá thanh toán (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className={clsx("w-full px-3 py-2 text-sm rounded-lg border", isDarkMode ? "bg-black/50 border-white/10 text-white" : "bg-white border-gray-300")} 
                                        value={editForm.amount_vnd || 0} 
                                        onChange={e => setEditForm({...editForm, amount_vnd: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className={clsx("block text-xs font-medium mb-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Mô tả</label>
                                    <input 
                                        type="text" 
                                        className={clsx("w-full px-3 py-2 text-sm rounded-lg border", isDarkMode ? "bg-black/50 border-white/10 text-white" : "bg-white border-gray-300")} 
                                        value={editForm.description || ""} 
                                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className={clsx("block text-xs font-medium mb-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>Badge (Nhãn)</label>
                                    <input 
                                        type="text" 
                                        className={clsx("w-full px-3 py-2 text-sm rounded-lg border", isDarkMode ? "bg-black/50 border-white/10 text-white" : "bg-white border-gray-300")} 
                                        value={editForm.badge || ""} 
                                        onChange={e => setEditForm({...editForm, badge: e.target.value})}
                                    />
                                </div>
                                <div className="flex gap-2 justify-end mt-4">
                                    <button onClick={handleCancelEdit} className="p-2 rounded-lg bg-gray-500/20 text-gray-500 hover:bg-gray-500/30">
                                        <X size={16} />
                                    </button>
                                    <button onClick={() => handleSave(plan.id)} className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30">
                                        <Check size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={() => handleEditClick(plan)} 
                                    className={clsx("absolute top-4 right-4 p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500")}
                                >
                                    <Edit2 size={16} />
                                </button>
                                {plan.badge && (
                                    <span className={clsx("absolute top-4 left-4 px-2 py-1 text-[10px] uppercase font-bold rounded", `bg-${plan.color}-500/20 text-${plan.color}-500`)}>
                                        {plan.badge}
                                    </span>
                                )}
                                <div className="mt-8">
                                    <h3 className={clsx("text-xl font-bold mb-2", isDarkMode ? "text-white" : "text-gray-900")}>{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className={clsx("text-2xl font-black", isDarkMode ? "text-gray-100" : "text-gray-800")}>{plan.price}</span>
                                        <span className={clsx("text-sm", isDarkMode ? "text-gray-500" : "text-gray-500")}>{plan.period}</span>
                                    </div>
                                    {plan.original_price && <p className="text-xs line-through text-red-400 mb-2">{plan.original_price}</p>}
                                    <p className={clsx("text-sm font-semibold mb-4", isDarkMode ? "text-gray-400" : "text-gray-600")}>Thanh toán: {plan.amount_vnd.toLocaleString('vi-VN')}₫</p>
                                    <p className={clsx("text-sm italic", isDarkMode ? "text-gray-400" : "text-gray-500")}>{plan.description}</p>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
