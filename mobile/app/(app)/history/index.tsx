import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';

interface Transaction {
    id: string;
    destination: string;
    date: string;
    fare: number;
    status: string;
    paymentMethod: string;
}

const API_URL = 'http://10.0.2.2:3000/api/rides';

export default function TransactionHistory() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = async () => {
        try {
            const res = await fetch(API_URL);
            const rides = await res.json();

            // Transform rides to transactions
            const txns = rides
                .filter((r: any) => r.status === 'COMPLETED')
                .map((r: any) => ({
                    id: r.id,
                    destination: r.destination || r.destAddress || 'Unknown',
                    date: new Date(r.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    fare: r.fare || 0,
                    status: r.paymentStatus || 'PAID',
                    paymentMethod: 'Card' // Mock
                }));

            setTransactions(txns);
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
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>📍</Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.destination} numberOfLines={1}>{item.destination}</Text>
                    <Text style={styles.date}>{item.date}</Text>
                </View>
                <View style={styles.cardRight}>
                    <Text style={styles.fare}>${item.fare.toFixed(2)}</Text>
                    <View style={[styles.badge, item.status === 'PAID' ? styles.paidBadge : styles.pendingBadge]}>
                        <Text style={styles.badgeText}>{item.status}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.paymentMethod}>💳 {item.paymentMethod}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Transaction History</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Summary Stats */}
            <View style={styles.summary}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{transactions.length}</Text>
                    <Text style={styles.statLabel}>Total Trips</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                        ${transactions.reduce((sum, t) => sum + t.fare, 0).toFixed(2)}
                    </Text>
                    <Text style={styles.statLabel}>Total Spent</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Loading...</Text>
                </View>
            ) : transactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🚗</Text>
                    <Text style={styles.emptyTitle}>No trips yet</Text>
                    <Text style={styles.emptyText}>Your completed rides will appear here</Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderTransaction}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D32F2F" />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 24,
        color: '#000',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    placeholder: {
        width: 40,
    },
    summary: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D32F2F',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    list: {
        padding: 20,
        paddingTop: 0,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    icon: {
        fontSize: 24,
    },
    cardContent: {
        flex: 1,
    },
    destination: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    date: {
        fontSize: 13,
        color: '#666',
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    fare: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    paidBadge: {
        backgroundColor: '#E8F5E9',
    },
    pendingBadge: {
        backgroundColor: '#FFF3E0',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    cardFooter: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
    },
    paymentMethod: {
        fontSize: 13,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
    },
});
