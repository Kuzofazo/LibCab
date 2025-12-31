import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

// Helper to determine API URL based on environment
// For Android Emulator, use 10.0.2.2
// For Physical Device, use your computer's LAN IP
const API_URL = 'http://10.0.2.2:3000/api/rides';

export default function RiderHome() {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [driverLoc, setDriverLoc] = useState({ latitude: 37.78825, longitude: -122.4324 });
    const [rideStatus, setRideStatus] = useState<string | null>(null);
    const [activeRideId, setActiveRideId] = useState<string | null>(null);

    // Poll for status updates
    useEffect(() => {
        if (!loading && !activeRideId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(API_URL);
                const rides = await res.json();

                // Find my active ride or the one I just finished
                // In real app, filter by User ID
                const myRide = rides.find((r: any) =>
                    (r.status !== 'CANCELED') &&
                    (rideStatus ? r.id === activeRideId : true) // Sticky to current ID if active
                );

                if (myRide) {
                    setRideStatus(myRide.status);
                    setActiveRideId(myRide.id);

                    // Driver Logic
                    if (myRide.status === 'ACCEPTED' && rideStatus !== 'ACCEPTED') {
                        setDriverLoc({
                            latitude: 37.78825 + 0.01,
                            longitude: -122.4324 + 0.01
                        });
                    }

                    // Payment Trigger
                    if (myRide.status === 'COMPLETED' && myRide.paymentStatus === 'PENDING') {
                        setLoading(false);
                        router.push({
                            pathname: '/(app)/payment',
                            params: {
                                rideId: myRide.id,
                                amount: myRide.amount || '20.00'
                            }
                        });
                    }
                }
            } catch (e) { }
        }, 3000);
        return () => clearInterval(interval);
    }, [loading, rideStatus, activeRideId]);

    // Simulate Driver Movement
    useEffect(() => {
        if (rideStatus === 'ACCEPTED' || rideStatus === 'IN_PROGRESS') {
            const interval = setInterval(() => {
                setDriverLoc(prev => ({
                    latitude: prev.latitude - 0.0001, // Move slowly South-West
                    longitude: prev.longitude - 0.0001
                }));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [rideStatus]);

    const handleSOS = () => {
        Alert.alert(
            "🚨 Emergency SOS",
            "This will notify your emergency contacts and share your live location. Are you in danger?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Send SOS Alert",
                    style: "destructive",
                    onPress: () => {
                        // In real app: Send location to emergency contacts, call 911, notify driver
                        Alert.alert(
                            "SOS Sent",
                            "Emergency alert sent! Your location has been shared with:\n\n• Emergency Services\n• Your emergency contacts\n• LibCab Support Team\n\nHelp is on the way. Stay safe."
                        );
                    }
                }
            ]
        );
    };

    const handleRequestRide = async () => {
        if (!search.trim()) {
            Alert.alert("Destination Required", "Please enter a destination.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: search,
                }),
            });

            if (res.ok) {
                const newRide = await res.json();
                setActiveRideId(newRide.id); // Track this specific ride
                Alert.alert("Success", "Ride requested! Waiting for driver...");
                setSearch('');
            } else {
                Alert.alert("Error", "Failed to request ride.");
            }
        } catch (error) {
            Alert.alert("Error", "Could not connect to server. Ensure web app is running.");
        }
        // Keep loading true to track 'active' state
    };

    return (
        <View style={styles.container}>
            {/* Map Background */}
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: 6.3156,
                    longitude: -10.7969,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                {/* User Location */}
                <Marker coordinate={{ latitude: 6.3156, longitude: -10.7969 }} title="You" pinColor="black" />

                {/* Live Driver */}
                {(rideStatus === 'ACCEPTED' || rideStatus === 'IN_PROGRESS') && (
                    <Marker
                        coordinate={driverLoc}
                        title="Your Driver"
                        description="Toyota Camry • 5 min away"
                    >
                        <View style={{ backgroundColor: 'white', padding: 5, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' }}>
                            <Text style={{ fontSize: 20 }}>🚖</Text>
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Overlay UI */}
            <SafeAreaView style={styles.overlay} edges={['top']}>
                <View style={styles.topActions}>
                    <View style={styles.searchBox}>
                        <View style={styles.dot} />
                        <TextInput
                            placeholder="Where to?"
                            value={search}
                            onChangeText={setSearch}
                            style={styles.input}
                            placeholderTextColor="#666"
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.walletTrigger}
                        onPress={() => router.push('/(app)/wallet')}
                    >
                        <Text style={styles.walletIcon}>💳</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* SOS Button - Shows during active ride */}
            {(rideStatus === 'ACCEPTED' || rideStatus === 'IN_PROGRESS') && (
                <View style={styles.sosContainer}>
                    <TouchableOpacity
                        style={styles.sosButton}
                        onPress={handleSOS}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.sosIcon}>🚨</Text>
                        <Text style={styles.sosText}>SOS</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Bottom Action */}
            <View style={styles.bottomSheet}>
                <Text style={styles.sheetTitle}>Get a ride</Text>
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleRequestRide}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? "Requesting..." : "Choose Destination"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        width: '100%',
        padding: 20,
    },
    topActions: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    searchBox: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    walletTrigger: {
        width: 54,
        height: 54,
        borderRadius: 12,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    walletIcon: {
        fontSize: 24,
    },
    pulse: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#D32F2F',
    },
    sosContainer: {
        position: 'absolute',
        top: 120,
        right: 20,
        zIndex: 10,
    },
    sosButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FF0000',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF0000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 3,
        borderColor: '#fff',
    },
    sosIcon: {
        fontSize: 24,
        marginBottom: 2,
    },
    sosText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D32F2F',
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: 'white',
        padding: 24,
        paddingBottom: 40,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#D32F2F',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#666',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
