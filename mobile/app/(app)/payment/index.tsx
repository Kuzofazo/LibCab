import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// API URL (should be centralized)
const API_URL = 'http://10.0.2.2:3000/api/rides';

export default function PaymentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { rideId, amount } = params;

    const [selectedMethod, setSelectedMethod] = useState<'cash' | 'paystack' | 'flutterwave'>('cash');
    const [processing, setProcessing] = useState(false);

    const handleConfirm = async () => {
        if (!rideId) {
            Alert.alert("Error", "No active ride found to pay for.");
            return;
        }

        setProcessing(true);

        // Mock Processing Delay
        setTimeout(async () => {
            try {
                await fetch(API_URL, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: rideId,
                        paymentStatus: 'PAID',
                        paymentMethod: selectedMethod,
                        status: 'COMPLETED'
                    })
                });

                Alert.alert("Success", "Payment Successful! Ride Closed.", [
                    { text: "OK", onPress: () => router.navigate('/(app)/rider') }
                ]);
            } catch (e) {
                Alert.alert("Error", "Payment Failed. Please try again.");
            } finally {
                setProcessing(false);
            }
        }, 2000);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Payment</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Total Amount</Text>
                    <Text style={styles.amountValue}>${amount || '0.00'}</Text>
                    <Text style={styles.amountLRD}>L$ {(parseFloat(amount as string || '0') * 185).toLocaleString()}</Text>
                    <Text style={styles.rateLabel}>Rate: $1 = L$185</Text>
                </View>

                <Text style={styles.sectionTitle}>Select Payment Method</Text>

                <TouchableOpacity
                    style={[
                        styles.methodCard,
                        selectedMethod === 'cash' && styles.selectedMethod
                    ]}
                    onPress={() => setSelectedMethod('cash')}
                >
                    <View style={styles.methodIcon}>
                        <Ionicons name="cash-outline" size={24} color="#000" />
                    </View>
                    <View style={styles.methodInfo}>
                        <Text style={styles.methodTitle}>Cash</Text>
                        <Text style={styles.methodDesc}>Pay cash to the driver</Text>
                    </View>
                    <View style={styles.radio}>
                        {selectedMethod === 'cash' && <View style={styles.radioInner} />}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.methodCard,
                        selectedMethod === 'paystack' && styles.selectedMethod
                    ]}
                    onPress={() => setSelectedMethod('paystack')}
                >
                    <View style={styles.methodIcon}>
                        <Ionicons name="card-outline" size={24} color="#000" />
                    </View>
                    <View style={styles.methodInfo}>
                        <Text style={styles.methodTitle}>Paystack</Text>
                        <Text style={styles.methodDesc}>Pay with Card via Paystack</Text>
                    </View>
                    <View style={styles.radio}>
                        {selectedMethod === 'paystack' && <View style={styles.radioInner} />}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.methodCard,
                        selectedMethod === 'flutterwave' && styles.selectedMethod
                    ]}
                    onPress={() => setSelectedMethod('flutterwave')}
                >
                    <View style={styles.methodIcon}>
                        <Ionicons name="card-outline" size={24} color="#000" />
                    </View>
                    <View style={styles.methodInfo}>
                        <Text style={styles.methodTitle}>Flutterwave</Text>
                        <Text style={styles.methodDesc}>Pay with Card via Flutterwave</Text>
                    </View>
                    <View style={styles.radio}>
                        {selectedMethod === 'flutterwave' && <View style={styles.radioInner} />}
                    </View>
                </TouchableOpacity>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.confirmBtn, processing && styles.disabledBtn]}
                    onPress={handleConfirm}
                    disabled={processing}
                >
                    {processing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.confirmBtnText}>Pay Now</Text>
                    )}
                </TouchableOpacity>
            </View>
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
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backBtn: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    content: {
        padding: 24,
    },
    amountContainer: {
        alignItems: 'center',
        marginBottom: 32,
        padding: 24,
        backgroundColor: '#f9f9f9',
        borderRadius: 16,
    },
    amountLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    amountValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
    },
    amountLRD: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D32F2F',
        marginTop: 4,
    },
    rateLabel: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    selectedMethod: {
        borderColor: '#D32F2F',
        backgroundColor: '#FFF5F5',
    },
    methodIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    methodInfo: {
        flex: 1,
    },
    methodTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    methodDesc: {
        fontSize: 14,
        color: '#666',
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#D32F2F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#D32F2F',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    confirmBtn: {
        backgroundColor: '#D32F2F',
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledBtn: {
        backgroundColor: '#ccc',
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
