import { View, Text, StyleSheet, Switch, ScrollView, Alert, TouchableOpacity, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

// For Android Emulator, use 10.0.2.2
const API_URL = 'http://10.0.2.2:3001/api';

export default function DriverHome() {
    const [isOnline, setIsOnline] = useState(false);
    const [incomingRide, setIncomingRide] = useState<any>(null);
    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [settlementReceipt, setSettlementReceipt] = useState<any | null>(null);
    const [stats, setStats] = useState({ earnings: 14.50, trips: 3, hours: 2.5 });
    const [token, setToken] = useState<string | null>(null);
    const incomingRideRef = useRef<any>(null);

    useEffect(() => {
        const loadToken = async () => {
            const t = await AsyncStorage.getItem('token');
            setToken(t);
        };
        loadToken();
    }, []);

    const playAlert = async () => {
        try {
            Vibration.vibrate([500, 1000, 500, 1000]);
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' }
            );
            await sound.playAsync();
        } catch (e) {
            console.log("Failed to play alert sound", e);
        }
    };

    // Location polling / Updates
    useEffect(() => {
        if (!isOnline || !token) return;
        const interval = setInterval(async () => {
            try {
                await fetch(`${API_URL}/driver/location`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ lat: 6.3156, lng: -10.8074 })
                });
            } catch (e) {}
        }, 10000);
        return () => clearInterval(interval);
    }, [isOnline, token]);

    // Assignment polling
    useEffect(() => {
        let interval: any;

        if (isOnline && token && !activeTrip) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`${API_URL}/driver/current-assignment`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (res.ok) {
                        const ride = await res.json();
                        if (ride && ride.id) {
                            if (!incomingRideRef.current || incomingRideRef.current.id !== ride.id) {
                                incomingRideRef.current = ride;
                                setIncomingRide(ride);
                                playAlert();
                                Alert.alert(
                                    "🚨 New Assignment!",
                                    `You have been assigned a pickup at ${ride.originAddress}.`,
                                    [{ text: "View Details" }]
                                );
                            }
                        } else {
                            incomingRideRef.current = null;
                            setIncomingRide(null);
                        }
                    } else {
                        incomingRideRef.current = null;
                        setIncomingRide(null);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 5000);
        } else {
            incomingRideRef.current = null;
            setIncomingRide(null);
        }

        return () => clearInterval(interval);
    }, [isOnline, activeTrip, token]);

    const handleAcceptRide = async () => {
        if (!incomingRide) return;
        try {
            const res = await fetch(`${API_URL}/rides`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    id: incomingRide.id,
                    status: 'IN_PROGRESS'
                })
            });

            if (res.ok) {
                setActiveTrip(incomingRide);
                setIsOnline(false);
                setIncomingRide(null);
            }
        } catch (e) {
            Alert.alert("Error", "Failed to start trip");
        }
    };

    const handleCancelTrip = () => {
        Alert.alert(
            "Cancel Trip",
            "Are you sure you want to cancel this trip?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await fetch(`${API_URL}/rides`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({
                                    id: activeTrip.id,
                                    status: 'REQUESTED',
                                    driverId: null
                                })
                            });
                            setActiveTrip(null);
                            setIsOnline(true);
                            Alert.alert("Cancelled", "The trip has been cancelled.");
                        } catch (e) { }
                    }
                }
            ]
        );
    };

    const handleCompleteTrip = async () => {
        const fareVal = activeTrip?.fare || 5.0;
        try {
            await fetch(`${API_URL}/rides`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    id: activeTrip.id,
                    status: 'COMPLETED',
                    paymentStatus: 'PAID'
                })
            });

            // Set settlement receipt data
            setSettlementReceipt({
                id: activeTrip.id,
                passengerName: activeTrip.rider?.name || activeTrip.guestName || "Passenger",
                payerPhone: activeTrip.customerPaymentPhone || activeTrip.rider?.phone || "+231 88 123 4567",
                origin: activeTrip.originAddress || activeTrip.origin || "Broad Street",
                destination: activeTrip.destAddress || activeTrip.destination || "Tubman Blvd",
                fare: fareVal,
                netPayout: fareVal * 0.85,
                driverPhone: "+231 88 012 3456 (Your MoMo Account)",
                date: new Date().toLocaleString()
            });

            setStats(prev => ({
                ...prev,
                earnings: prev.earnings + fareVal * 0.85,
                trips: prev.trips + 1
            }));

            setActiveTrip(null);
            setIsOnline(true);
        } catch (e) {
            Alert.alert("Notice", "Trip finished.");
            setActiveTrip(null);
            setIsOnline(true);
        }
    };

    // If Driver viewing settlement receipt
    if (settlementReceipt) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Trip Settlement Receipt</Text>
                </View>

                <ScrollView contentContainerStyle={styles.receiptContent}>
                    <View style={styles.receiptCard}>
                        <View style={styles.receiptBadgeHeader}>
                            <Ionicons name="checkmark-circle" size={32} color="#059669" />
                            <Text style={styles.receiptBadgeTitle}>Trip Settled Successfully ✓</Text>
                            <Text style={styles.receiptRefText}>Ref #{settlementReceipt.id.slice(-8).toUpperCase()}</Text>
                        </View>

                        <View style={styles.receiptAmountBox}>
                            <Text style={styles.receiptAmountLabel}>Your Net Payout (85%)</Text>
                            <Text style={styles.receiptAmountValue}>${settlementReceipt.netPayout.toFixed(2)}</Text>
                            <Text style={styles.receiptAmountLRD}>L$ {(settlementReceipt.netPayout * 185).toLocaleString()}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Passenger Name</Text>
                            <Text style={styles.receiptValue}>{settlementReceipt.passengerName}</Text>
                        </View>

                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Number Used for Payment</Text>
                            <Text style={[styles.receiptValue, styles.monoText]}>{settlementReceipt.payerPhone}</Text>
                        </View>

                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Payout Receiving Account</Text>
                            <Text style={[styles.receiptValue, styles.monoText, { color: '#059669' }]}>
                                {settlementReceipt.driverPhone}
                            </Text>
                        </View>

                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Total Gross Fare</Text>
                            <Text style={styles.receiptValue}>${settlementReceipt.fare.toFixed(2)}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.locationBlock}>
                            <Text style={styles.locationLabel}>Trip Route</Text>
                            <Text style={styles.locationText}>📍 {settlementReceipt.origin}</Text>
                            <Text style={[styles.locationText, { marginTop: 4 }]}>🏁 {settlementReceipt.destination}</Text>
                        </View>

                        <Text style={styles.receiptFooterNote}>
                            AfriCab Driver Partner Electronic Settlement • Monrovia Fleet
                        </Text>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.doneBtn}
                        onPress={() => setSettlementReceipt(null)}
                    >
                        <Text style={styles.doneBtnText}>Ready for Next Trip</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Plain White Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>AfriCab Driver Partner</Text>
                    <Text style={styles.name}>Welcome Back</Text>
                </View>
                <View style={[styles.statusContainer, activeTrip && { opacity: 0.5 }]}>
                    <Text style={[styles.statusText, isOnline && styles.onlineText]}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Text>
                    <Switch
                        value={isOnline}
                        onValueChange={setIsOnline}
                        disabled={!!activeTrip}
                        trackColor={{ false: '#e2e8f0', true: '#0f172a' }}
                        thumbColor={'#ffffff'}
                    />
                </View>
            </View>

            {activeTrip ? (
                <View style={styles.activeTripCard}>
                    <View style={styles.tripHeader}>
                        <Text style={styles.tripStatus}>ACTIVE MISSION</Text>
                        <Text style={styles.tripId}>#{activeTrip.id.slice(-6).toUpperCase()}</Text>
                    </View>

                    <View style={styles.routeContainer}>
                        <View style={styles.routeItem}>
                            <View style={styles.pickupDot} />
                            <Text style={styles.addressText}>{activeTrip.originAddress || activeTrip.origin}</Text>
                        </View>
                        <View style={styles.dottedLine} />
                        <View style={styles.routeItem}>
                            <View style={styles.dropoffDot} />
                            <Text style={styles.addressText}>{activeTrip.destAddress || activeTrip.destination}</Text>
                        </View>
                    </View>

                    <View style={styles.tripStats}>
                        <View>
                            <Text style={styles.statLabel}>Expected Fare</Text>
                            <Text style={styles.statValue}>${(activeTrip.fare || 5.0).toFixed(2)}</Text>
                            <Text style={styles.secondaryFare}>L$ {(((activeTrip.fare || 5.0)) * 185).toLocaleString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.statLabel}>Net Payout</Text>
                            <Text style={[styles.statValue, { color: '#059669' }]}>
                                ${((activeTrip.fare || 5.0) * 0.85).toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.activeActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelTrip}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.completeBtn} onPress={handleCompleteTrip}>
                            <Text style={styles.completeBtnText}>End Ride &amp; Settle</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : isOnline ? (
                incomingRide ? (
                    <View style={styles.requestCard}>
                        <Text style={styles.requestTitle}>🚨 New Trip Request!</Text>

                        <View style={styles.routeContainer}>
                            <Text style={styles.label}>PICKUP</Text>
                            <Text style={styles.address}>{incomingRide.originAddress || incomingRide.origin}</Text>
                            <View style={styles.connector} />
                            <Text style={styles.label}>DROPOFF</Text>
                            <Text style={styles.address}>{incomingRide.destAddress || incomingRide.destination}</Text>
                        </View>

                        <View style={styles.fareContainer}>
                            <View>
                                <Text style={styles.fare}>${(incomingRide.fare || 4.5).toFixed(2)}</Text>
                                <Text style={styles.secondaryFare}>L$ {(((incomingRide.fare || 4.5)) * 185).toLocaleString()}</Text>
                            </View>
                            <Text style={styles.distance}>{incomingRide.vehicleType || "Sedan"}</Text>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptRide}>
                                <Text style={styles.acceptText}>Accept Trip Request</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.waitingContainer}>
                        <View style={styles.radar}>
                            <Ionicons name="radio-outline" size={40} color="#059669" />
                        </View>
                        <Text style={styles.waitingTitle}>Online &amp; Ready</Text>
                        <Text style={styles.waitingText}>Finding passenger requests in Monrovia...</Text>
                    </View>
                )
            ) : (
                <ScrollView style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Today&apos;s Net Earnings</Text>
                        <Text style={styles.statValue}>${stats.earnings.toFixed(2)}</Text>
                        <Text style={styles.secondaryFare}>L$ {(stats.earnings * 185).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statRow}>
                        <View style={[styles.statCard, { flex: 1 }]}>
                            <Text style={styles.statLabel}>Completed Trips</Text>
                            <Text style={styles.statValue}>{stats.trips}</Text>
                        </View>
                        <View style={[styles.statCard, { flex: 1 }]}>
                            <Text style={styles.statLabel}>Hours Online</Text>
                            <Text style={styles.statValue}>{stats.hours}h</Text>
                        </View>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 16, 
        backgroundColor: '#ffffff', 
        borderBottomWidth: 1, 
        borderBottomColor: '#e2e8f0' 
    },
    title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    greeting: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: '800' },
    name: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
    statusContainer: { alignItems: 'flex-end' },
    statusText: { fontSize: 11, fontWeight: 'bold', marginBottom: 2, color: '#64748b' },
    onlineText: { color: '#059669' },
    statsContainer: { padding: 20 },
    statCard: { 
        backgroundColor: '#f8fafc', 
        padding: 20, 
        borderRadius: 20, 
        marginBottom: 14, 
        borderWidth: 1, 
        borderColor: '#e2e8f0' 
    },
    statRow: { flexDirection: 'row', gap: 12 },
    statLabel: { fontSize: 11, color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    secondaryFare: { fontSize: 13, fontWeight: '800', color: '#059669', marginTop: 2 },
    waitingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    radar: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        backgroundColor: '#ecfdf5', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: '#a7f3d0' 
    },
    waitingTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    waitingText: { fontSize: 13, color: '#64748b' },
    requestCard: { 
        margin: 20, 
        backgroundColor: '#ffffff', 
        borderRadius: 24, 
        padding: 20, 
        borderWidth: 1.5, 
        borderColor: '#0f172a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3
    },
    requestTitle: { color: '#0f172a', fontWeight: '900', fontSize: 18, marginBottom: 16, textAlign: 'center' },
    routeContainer: { width: '100%', marginBottom: 16 },
    label: { color: '#94a3b8', fontSize: 10, fontWeight: '800', marginBottom: 2 },
    address: { color: '#0f172a', fontSize: 14, fontWeight: '700', marginBottom: 12 },
    connector: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 12 },
    fareContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        width: '100%', 
        alignItems: 'center', 
        marginBottom: 20, 
        backgroundColor: '#f8fafc', 
        padding: 14, 
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    fare: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
    distance: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
    actions: { flexDirection: 'row' },
    acceptBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#0f172a', alignItems: 'center' },
    acceptText: { color: '#ffffff', fontWeight: '900', fontSize: 14, textTransform: 'uppercase' },
    activeTripCard: { 
        margin: 20, 
        backgroundColor: '#ffffff', 
        borderRadius: 24, 
        padding: 20, 
        borderWidth: 1, 
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3
    },
    tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    tripStatus: { backgroundColor: '#0f172a', color: '#ffffff', fontSize: 10, fontWeight: '900', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    tripId: { fontSize: 11, color: '#64748b', fontWeight: 'bold' },
    routeItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pickupDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#059669' },
    dropoffDot: { width: 10, height: 10, borderRadius: 2, backgroundColor: '#dc2626' },
    addressText: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
    dottedLine: { width: 1, height: 16, borderLeftWidth: 1.5, borderLeftColor: '#cbd5e1', borderStyle: 'dashed', marginLeft: 4.5, marginVertical: 3 },
    tripStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 20, marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    activeActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
    cancelBtnText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
    completeBtn: { flex: 2, padding: 14, borderRadius: 14, backgroundColor: '#059669', alignItems: 'center' },
    completeBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },

    // Receipt Styles
    receiptContent: { padding: 20 },
    receiptCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    receiptBadgeHeader: { alignItems: 'center', marginBottom: 16 },
    receiptBadgeTitle: { fontSize: 16, fontWeight: '900', color: '#059669', marginTop: 6 },
    receiptRefText: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginTop: 2 },
    receiptAmountBox: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    receiptAmountLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
    receiptAmountValue: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginTop: 2 },
    receiptAmountLRD: { fontSize: 14, fontWeight: '800', color: '#059669', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 14 },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    receiptLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    receiptValue: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
    monoText: { fontFamily: 'monospace' },
    locationBlock: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    locationLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 },
    locationText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
    receiptFooterNote: { fontSize: 10, textAlign: 'center', color: '#94a3b8', fontWeight: '600', marginTop: 12 },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff' },
    doneBtn: { backgroundColor: '#0f172a', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    doneBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900', textTransform: 'uppercase' },
});
