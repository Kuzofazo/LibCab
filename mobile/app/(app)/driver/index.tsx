import { View, Text, StyleSheet, Switch, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

// For Android Emulator, use 10.0.2.2
const API_URL = 'http://10.0.2.2:3000/api/rides';

export default function DriverHome() {
    const [isOnline, setIsOnline] = useState(false);
    const [incomingRide, setIncomingRide] = useState<any>(null);
    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [stats, setStats] = useState({ earnings: 0, trips: 0, hours: 0 });

    // Fetch initial earnings/stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(API_URL);
                const rides = await res.json();
                const completedRides = rides.filter((r: any) => r.status === 'COMPLETED');
                const totalEarnings = completedRides.reduce((sum: number, r: any) => sum + (r.fare || 0), 0);
                setStats({
                    earnings: totalEarnings,
                    trips: completedRides.length,
                    hours: parseFloat((completedRides.length * 0.5).toFixed(1))
                });
            } catch (e) { }
        };
        fetchStats();
    }, []);


    useEffect(() => {
        let interval: NodeJS.Timeout;

        // Poll for new rides when online and NOT on a trip
        if (isOnline && !activeTrip) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(API_URL);
                    const rides = await res.json();
                    const requestedRide = rides.find((r: any) => r.status === 'REQUESTED');

                    if (requestedRide) {
                        setIncomingRide(requestedRide);
                    } else {
                        setIncomingRide(null);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 5000);
        } else {
            setIncomingRide(null);
        }

        return () => clearInterval(interval);
    }, [isOnline, activeTrip]);

    const handleAcceptRide = async () => {
        if (!incomingRide) return;

        try {
            const res = await fetch(API_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: incomingRide.id,
                    status: 'ACCEPTED',
                    driver: 'Current Driver'
                })
            });

            if (res.ok) {
                setActiveTrip(incomingRide);
                setIsOnline(false); // Go offline while on trip
                setIncomingRide(null);
            }
        } catch (e) {
            Alert.alert("Error", "Failed to accept trip");
        }
    };

    const handleCancelTrip = () => {
        Alert.alert(
            "Cancel Trip",
            "Are you sure you want to cancel this trip? Frequent cancellations may affect your rating.",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await fetch(API_URL, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id: activeTrip.id,
                                    status: 'REQUESTED', // Put it back for others
                                    driver: null
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
        try {
            await fetch(API_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: activeTrip.id,
                    status: 'COMPLETED'
                })
            });
            setActiveTrip(null);
            setIsOnline(true);
            Alert.alert("Success", "Trip completed! Earnings updated.");
        } catch (e) { }
    };


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Good morning,</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.name}>Driver</Text>
                        <TouchableOpacity onPress={() => Alert.alert("Updates", "No new updates for today.")}>
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifText}>!</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={[styles.statusContainer, activeTrip && { opacity: 0.5 }]}>
                    <Text style={[styles.statusText, isOnline && styles.onlineText]}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Text>
                    <Switch
                        value={isOnline}
                        onValueChange={setIsOnline}
                        disabled={!!activeTrip}
                        trackColor={{ false: '#eee', true: '#000' }}
                        thumbColor={'#fff'}
                    />
                </View>
            </View>

            {activeTrip ? (
                <View style={styles.activeTripCard}>
                    <View style={styles.tripHeader}>
                        <Text style={styles.tripStatus}>ON TRIP</Text>
                        <Text style={styles.tripId}>{activeTrip.id}</Text>
                    </View>

                    <View style={styles.routeContainer}>
                        <View style={styles.routeItem}>
                            <View style={styles.pickupDot} />
                            <Text style={styles.addressText}>{activeTrip.origin}</Text>
                        </View>
                        <View style={styles.dottedLine} />
                        <View style={styles.routeItem}>
                            <View style={styles.dropoffDot} />
                            <Text style={styles.addressText}>{activeTrip.destination}</Text>
                        </View>
                    </View>

                    <View style={styles.tripStats}>
                        <View>
                            <Text style={styles.statLabel}>Expected Fare</Text>
                            <Text style={styles.statValue}>${activeTrip.fare?.toFixed(2)}</Text>
                            <Text style={styles.secondaryFare}>L$ {(activeTrip.fare * 185).toLocaleString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.statLabel}>Distance</Text>
                            <Text style={styles.statValue}>2.5 mi</Text>
                        </View>
                    </View>

                    <View style={styles.activeActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelTrip}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.completeBtn} onPress={handleCompleteTrip}>
                            <Text style={styles.completeBtnText}>Complete Trip</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : isOnline ? (
                incomingRide ? (
                    <View style={styles.requestCard}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.requestTitle}>LibCab: New Request!</Text>

                        <View style={styles.routeContainer}>
                            <Text style={styles.label}>PICKUP</Text>
                            <Text style={styles.address}>{incomingRide.origin}</Text>
                            <div style={styles.connector} />
                            <Text style={styles.label}>DROPOFF</Text>
                            <Text style={styles.address}>{incomingRide.destination}</Text>
                        </View>

                        <View style={styles.fareContainer}>
                            <View>
                                <Text style={styles.fare}>${incomingRide.fare?.toFixed(2)}</Text>
                                <Text style={styles.secondaryFare}>L$ {(incomingRide.fare * 185).toLocaleString()}</Text>
                            </View>
                            <Text style={styles.distance}>Nearby Trip</Text>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.declineBtn} onPress={() => setIncomingRide(null)}>
                                <Text style={styles.declineText}>Decline</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptRide}>
                                <Text style={styles.acceptText}>Accept Trip</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.waitingContainer}>
                        <View style={styles.radar}>
                            <View style={styles.radarInner} />
                        </View>
                        <Text style={styles.waitingText}>Finding trips in Monrovia...</Text>
                    </View>
                )
            ) : (
                <ScrollView style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Today's Earnings</Text>
                        <Text style={styles.statValue}>${stats.earnings.toFixed(2)}</Text>
                        <Text style={styles.secondaryFare}>L$ {(stats.earnings * 185).toLocaleString()}</Text>
                    </View>
                    <View style={styles.statRow}>
                        <View style={[styles.statCard, { flex: 1 }]}>
                            <Text style={styles.statLabel}>Trips</Text>
                            <Text style={styles.statValue}>{stats.trips}</Text>
                        </View>
                        <View style={[styles.statCard, { flex: 1 }]}>
                            <Text style={styles.statLabel}>Hours</Text>
                            <Text style={styles.statValue}>{stats.hours}</Text>
                        </View>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    greeting: {
        fontSize: 12,
        color: '#666',
        textTransform: 'uppercase',
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    name: {
        fontSize: 28,
        fontWeight: '900',
        color: '#000',
    },
    notifBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D32F2F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#666',
    },
    onlineText: {
        color: '#22c55e',
    },
    statsContainer: {
        padding: 24,
    },
    statCard: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 36,
        fontWeight: '900',
        color: '#000',
    },
    secondaryFare: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#D32F2F',
        marginTop: 2,
    },
    waitingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radar: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#f1f1f1',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#eee',
    },
    radarInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#D32F2F',
        opacity: 0.1,
    },
    waitingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#999',
    },
    // Request Card
    requestCard: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#D32F2F',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    requestTitle: {
        color: '#D32F2F',
        fontWeight: '900',
        fontSize: 20,
        marginBottom: 24,
        textAlign: 'center',
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D32F2F',
        position: 'absolute',
        top: 24,
        right: 24,
    },
    routeContainer: {
        width: '100%',
        marginBottom: 24,
    },
    label: {
        color: '#aaa',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    address: {
        color: 'black',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    connector: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginBottom: 16,
    },
    fareContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        marginBottom: 32,
        backgroundColor: '#fafafa',
        padding: 16,
        borderRadius: 20,
    },
    fare: {
        color: 'black',
        fontSize: 32,
        fontWeight: '900',
    },
    distance: {
        color: '#D32F2F',
        fontSize: 12,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    declineBtn: {
        flex: 1,
        padding: 18,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
    },
    declineText: {
        color: '#666',
        fontWeight: 'bold',
    },
    acceptBtn: {
        flex: 2,
        padding: 18,
        borderRadius: 20,
        backgroundColor: 'black',
        alignItems: 'center',
    },
    acceptText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Active Trip Card
    activeTripCard: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    tripStatus: {
        backgroundColor: '#000',
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tripId: {
        fontSize: 10,
        color: '#999',
        fontWeight: 'bold',
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    pickupDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#D32F2F',
    },
    dropoffDot: {
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: '#000',
    },
    addressText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        flex: 1,
    },
    dottedLine: {
        width: 1,
        height: 20,
        borderLeftWidth: 1,
        borderLeftColor: '#ddd',
        borderStyle: 'dashed',
        marginLeft: 4.5,
        marginVertical: 4,
    },
    tripStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 24,
        marginBottom: 24,
        marginTop: 12,
    },
    activeActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 18,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#f0f0f0',
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#999',
        fontWeight: 'bold',
    },
    completeBtn: {
        flex: 2,
        padding: 18,
        borderRadius: 20,
        backgroundColor: '#22c55e',
        alignItems: 'center',
    },
    completeBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
