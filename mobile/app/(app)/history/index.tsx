import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
    id: string;
    destination: string;
    origin: string;
    driverName: string;
    payerPhone: string;
    recipientPhone: string;
    date: string;
    fare: number;
    status: string;
    paymentMethod: string;
}

const API_URL = 'http://10.0.2.2:3001/api/rides';

export default function TransactionHistory() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = async () => {
        try {
            const res = await fetch(API_URL);
            const rides = await res.json();

            if (Array.isArray(rides)) {
                const txns = rides
                    .filter((r: any) => r.status === 'COMPLETED')
                    .map((r: any) => ({
                        id: r.id,
                        destination: r.destination || r.destAddress || 'Sinkor, Monrovia',
                        origin: r.origin || r.originAddress || 'Broad Street, Monrovia',
                        driverName: r.driver?.user?.name || 'Verified Driver',
                        payerPhone: r.customerPaymentPhone || r.rider?.phone || '+231 88 123 4567',
                        recipientPhone: r.driverPaymentPhone || r.driver?.user?.phone || '+231 77 000 8888 (AfriCab)',
                        date: new Date(r.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        }),
                        fare: r.fare || 5.0,
                        status: r.paymentStatus || 'PAID',
                        paymentMethod: r.paymentMethod === 'ORANGE' ? 'Orange Money' : r.paymentMethod === 'CARD' ? 'Card / Stripe' : 'MTN Mobile Money'
                    }));

                setTransactions(txns);
            }
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTransactions();
    };

    const renderTransaction = ({ item }: { item: Transaction }) => (
        <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.7}
            onPress={() => setSelectedReceipt(item)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Ionicons name="receipt-outline" size={20} color="#0f172a" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.destination} numberOfLines={1}>{item.destination}</Text>
                    <Text style={styles.date}>Driver: {item.driverName} • {item.date}</Text>
                </View>
                <View style={styles.cardRight}>
                    <Text style={styles.fare}>${item.fare.toFixed(2)}</Text>
                    <View style={styles.paidBadge}>
                        <Text style={styles.badgeText}>PAID ✓</Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.paymentMethod}>💳 {item.paymentMethod}</Text>
                <Text style={styles.viewReceiptText}>View Receipt ➔</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.title}>Ride &amp; Payment History</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Summary Stats */}
            <View style={styles.summary}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Trips</Text>
                    <Text style={styles.statValue}>{transactions.length}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Spent</Text>
                    <Text style={[styles.statValue, { color: '#059669' }]}>
                        ${transactions.reduce((sum, t) => sum + t.fare, 0).toFixed(2)}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Loading receipts...</Text>
                </View>
            ) : transactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="car-outline" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyTitle}>No completed rides yet</Text>
                    <Text style={styles.emptyText}>Completed trip receipts will be stored here automatically.</Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderTransaction}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />
                    }
                />
            )}

            {/* Detailed Receipt Modal */}
            {selectedReceipt && (
                <Modal visible={!!selectedReceipt} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Official Electronic Receipt</Text>
                                <TouchableOpacity onPress={() => setSelectedReceipt(null)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={20} color="#0f172a" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 420 }}>
                                <View style={styles.receiptBox}>
                                    <Text style={styles.receiptRef}>Ref #{selectedReceipt.id.slice(-8).toUpperCase()}</Text>
                                    <Text style={styles.receiptFare}>${selectedReceipt.fare.toFixed(2)}</Text>
                                    <Text style={styles.receiptFareLRD}>L$ {(selectedReceipt.fare * 185).toLocaleString()}</Text>
                                </View>

                                <View style={styles.receiptDetails}>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.rLabel}>Driver Name</Text>
                                        <Text style={styles.rVal}>{selectedReceipt.driverName}</Text>
                                    </View>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.rLabel}>Number Used for Payment</Text>
                                        <Text style={[styles.rVal, styles.mono]}>{selectedReceipt.payerPhone}</Text>
                                    </View>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.rLabel}>Number Paid To</Text>
                                        <Text style={[styles.rVal, styles.mono, { color: '#059669' }]}>
                                            {selectedReceipt.recipientPhone}
                                        </Text>
                                    </View>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.rLabel}>Payment Method</Text>
                                        <Text style={styles.rVal}>{selectedReceipt.paymentMethod}</Text>
                                    </View>
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.rLabel}>Date</Text>
                                        <Text style={styles.rVal}>{selectedReceipt.date}</Text>
                                    </View>
                                </View>

                                <View style={styles.routeBox}>
                                    <Text style={styles.rLabel}>Pickup Location</Text>
                                    <Text style={styles.routeText}>📍 {selectedReceipt.origin}</Text>
                                    <Text style={[styles.rLabel, { marginTop: 8 }]}>Dropoff Destination</Text>
                                    <Text style={styles.routeText}>🏁 {selectedReceipt.destination}</Text>
                                </View>
                            </ScrollView>

                            <TouchableOpacity 
                                style={styles.closeModalBtn}
                                onPress={() => setSelectedReceipt(null)}
                            >
                                <Text style={styles.closeModalBtnText}>Close Receipt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '900',
        color: '#0f172a',
    },
    placeholder: {
        width: 36,
    },
    summary: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0f172a',
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cardContent: {
        flex: 1,
    },
    destination: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 2,
    },
    date: {
        fontSize: 11,
        color: '#64748b',
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    fare: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 2,
    },
    paidBadge: {
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#059669',
    },
    cardFooter: {
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentMethod: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    viewReceiptText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0f172a',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 4,
    },
    emptyText: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f172a',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    receiptBox: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 14,
    },
    receiptRef: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
    },
    receiptFare: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0f172a',
        marginTop: 2,
    },
    receiptFareLRD: {
        fontSize: 13,
        fontWeight: '800',
        color: '#059669',
        marginTop: 2,
    },
    receiptDetails: {
        marginBottom: 14,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    rLabel: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    rVal: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0f172a',
    },
    mono: {
        fontFamily: 'monospace',
    },
    routeBox: {
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
    },
    routeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 1,
    },
    closeModalBtn: {
        backgroundColor: '#0f172a',
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeModalBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
});
