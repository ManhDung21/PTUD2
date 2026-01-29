"use client";

import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Brush
} from "recharts";
import clsx from "clsx";

interface TimeSeriesDataPoint {
    timestamp: string;
    active_users: number;
    descriptions_created: number;
    new_registrations: number;
}

interface TimeSeriesChartProps {
    data: TimeSeriesDataPoint[];
    isDarkMode: boolean;
    granularity: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, isDarkMode, granularity }) => {
    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className={clsx(
                    "p-3 rounded-lg border shadow-lg",
                    isDarkMode ? "bg-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
                )}>
                    <p className={clsx("text-xs font-semibold mb-2", isDarkMode ? "text-white" : "text-gray-900")}>
                        {label}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: <span className="font-bold">{entry.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 10 }}
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDarkMode ? "#333" : "#e5e7eb"}
                />
                <XAxis
                    dataKey="timestamp"
                    stroke={isDarkMode ? "#9ca3af" : "#6b7280"}
                    style={{ fontSize: '12px' }}
                    angle={granularity === "hour" ? -45 : 0}
                    textAnchor={granularity === "hour" ? "end" : "middle"}
                    height={granularity === "hour" ? 80 : 60}
                />
                <YAxis
                    stroke={isDarkMode ? "#9ca3af" : "#6b7280"}
                    style={{ fontSize: '12px' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{
                        fontSize: '12px',
                        color: isDarkMode ? '#d1d5db' : '#374151'
                    }}
                />
                <Brush
                    dataKey="timestamp"
                    height={30}
                    stroke={isDarkMode ? "#8b5cf6" : "#3b82f6"}
                    fill={isDarkMode ? "#000000ff" : "#f3f4f6"}
                    startIndex={0}
                    endIndex={Math.floor(data.length * 0.9)}
                />

                {/* Active Users Line */}
                <Line
                    type="monotone"
                    dataKey="active_users"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Người dùng đang hoạt động"
                />

                {/* Descriptions Created Line */}
                <Line
                    type="monotone"
                    dataKey="descriptions_created"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Nội dung đã tạo"
                />

                {/* New Registrations Line */}
                <Line
                    type="monotone"
                    dataKey="new_registrations"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Đăng ký mới"
                />
            </LineChart>
        </ResponsiveContainer>
    );
};
