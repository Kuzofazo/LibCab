import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';

export default function WalletScreen() {
    const [balance, setBalance] = useState(150.50);
    const [addAmount, setAddAmount] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddFunds = () => {
        const amount = parseFloat(addAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount to add.");
            return;
        }

        // Mock payment integration flow
        Alert.alert(
            "Add Funds",
            `Do you want to add $${amount.toFixed(2)} to your Paye Wallet?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Pay with Paystack",
                    onPress: () => simulatePayment(amount)
                }
            ]
        );
    };

    const simulatePayment = (amount: number) => {
        setIsAdding(true);
        // Simulate network delay
        setTimeout(() => {
            setBalance(prev => prev + amount);
            setAddAmount('');
            setIsAdding(false);
            Alert.alert("Success", `$${amount.toFixed(2)} added to your wallet!`);
        }, 2000);
    };

    const transactions = [
        { id: '1', type: 'Ride Payment', amount: -25.00, date: 'Oct 12, 2023', status: 'Completed' },
        { id: '2', type: 'Added Funds', amount: 50.00, date: 'Oct 10, 2023', status: 'Completed' },
        { id: '3', type: 'Ride Payment', amount: -18.50, date: 'Oct 08, 2023', status: 'Completed' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>My Wallet</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <Text style={styles.balanceValue}>${balance.toFixed(2)}</Text>
                </View>

                {/* Quick Add Funds */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Add Funds</Text>
                    <View style={styles.addFundsContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter amount (e.g. 50)"
                            keyboardType="numeric"
                            value={addAmount}
                            onChangeText={setAddAmount}
                        />
                        <TouchableOpacity
                            style={[styles.addButton, isAdding && styles.disabledButton]}
                            onPress={handleAddFunds}
                            disabled={isAdding}
                        >
                            <Text style={styles.addButtonText}>{isAdding ? '...' : 'Add'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.presets}>
                        {[10, 20, 50, 100].map(val => (
                            <TouchableOpacity
                                key={val}
                                style={styles.presetBtn}
                                onPress={() => setAddAmount(val.toString())}
                            >
                                <Text style={styles.presetText}>+${val}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Transaction History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    {transactions.map(item => (
                        <View key={item.id} style={styles.txRow}>
                            <View>
                                <Text style={styles.txType}>{item.type}</Text>
                                <Text style={styles.txDate}>{item.date}</Text>
                            </View>
                            <Text style={[styles.txAmount, item.amount > 0 ? styles.positive : styles.negative]}>
                                {item.amount > 0 ? '+' : ''}${Math.abs(item.amount).toFixed(2)}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
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
        fontWeight: 'bold',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
    },
    balanceCard: {
        backgroundColor: '#D32F2F',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 8,
    },
    balanceValue: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    addFundsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    addButton: {
        backgroundColor: '#000',
        borderRadius: 12,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    presets: {
        flexDirection: 'row',
        gap: 10,
    },
    presetBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    presetText: {
        fontSize: 14,
        color: '#666',
    },
    txRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    txType: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    txDate: {
        fontSize: 12,
        color: '#999',
    },
    txAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    positive: {
        color: '#22c55e',
    },
    negative: {
        color: '#ff4444',
    },
});
