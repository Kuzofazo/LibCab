import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Image, Switch, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

const API_URL = 'http://10.0.2.2:3001/api/rides';
const { width } = Dimensions.get('window');

export default function RiderScreen() {
    const router = useRouter();
    const [serviceMode, setServiceMode] = useState<'Transport' | 'Taxi' | 'Delivery'>('Taxi');
    const [selectedTier, setSelectedTier] = useState<'Standard' | 'Comfort' | 'Business'>('Standard');
    const [shareLocation, setShareLocation] = useState(true);

    const [pickup, setPickup] = useState('2578 Bergen Blvd, New York');
    const [destination, setDestination] = useState('1417 West End Ave, New York');
    const [loading, setLoading] = useState(false);
    
    // Active Ride State
    const [activeRide, setActiveRide] = useState<any | null>(null);

    const rideStatusRef = useRef<string | null>(null);
    const activeRideIdRef = useRef<string | null>(null);

    useEffect(() => {
        rideStatusRef.current = activeRide?.status || null;
        activeRideIdRef.current = activeRide?.id || null;
    }, [activeRide]);

    // Polling Active Ride Status
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!activeRideIdRef.current) return;
            try {
                const res = await fetch(API_URL);
                const rides = await res.json();
                if (Array.isArray(rides)) {
                    const myRide = rides.find((r: any) => r.id === activeRideIdRef.current);
                    if (myRide) {
                        setActiveRide(myRide);

                        // Trigger Payment / Receipt if ride completed
                        if (myRide.status === 'COMPLETED' && myRide.paymentStatus === 'PENDING') {
                            router.push({
                                pathname: '/(app)/payment',
                                params: {
                                    rideId: myRide.id,
                                    amount: String(myRide.fare || 27.00),
                                    driverName: myRide.driver?.user?.name || "Harry Parker",
                                    origin: myRide.originAddress || pickup,
                                    destination: myRide.destAddress || destination
                                }
                            });
                        }
                    }
                }
            } catch (e) {}
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleRequestRide = async () => {
        setLoading(true);
        try {
            const fareAmount = selectedTier === 'Standard' ? 27.00 : selectedTier === 'Comfort' ? 35.00 : 52.00;
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originAddress: pickup,
                    destAddress: destination,
                    originLat: 6.3156,
                    originLng: -10.7969,
                    destLat: 6.3000,
                    destLng: -10.7900,
                    vehicleType: 'Car',
                    rideCategory: selectedTier,
                    fare: fareAmount,
                    customerPaymentPhone: "+231 88 123 4567",
                    paymentMethod: "MOMO"
                })
            });

            if (res.ok) {
                const data = await res.json();
                setActiveRide(data);
            } else {
                // Mock active ride for presentation
                setActiveRide({
                    id: "RC-" + Math.floor(Math.random() * 89999 + 10000),
                    status: "ACCEPTED",
                    originAddress: pickup,
                    destAddress: destination,
                    driver: {
                        user: { name: "Harry Parker", phone: "+231 88 012 3456" },
                        vehicleColor: "Black",
                        vehicleModel: "Toyota Corolla",
                        licensePlate: "C 3555 OE",
                        rating: 4.9
                    },
                    fare: fareAmount
                });
            }
        } catch (e) {
            setActiveRide({
                id: "RC-77291",
                status: "ACCEPTED",
                originAddress: pickup,
                destAddress: destination,
                driver: {
                    user: { name: "Harry Parker", phone: "+231 88 012 3456" },
                    vehicleColor: "Black",
                    vehicleModel: "Toyota Corolla",
                    licensePlate: "C 3555 OE",
                    rating: 4.9
                },
                fare: 27.00
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRide = () => {
        Alert.alert("Cancel Ride", "Are you sure you want to cancel?", [
            { text: "No", style: "cancel" },
            { 
                text: "Yes, Cancel", 
                style: "destructive",
                onPress: () => setActiveRide(null)
            }
        ]);
    };

    return (
        <View style={styles.container}>
            {/* Top Fullscreen Map with Route */}
            <MapView
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                    latitude: 6.3156,
                    longitude: -10.7969,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                }}
            >
                <Marker coordinate={{ latitude: 6.3156, longitude: -10.7969 }} title="Pickup">
                    <View style={styles.mapPin}>
                        <View style={styles.mapPinInner} />
                    </View>
                </Marker>

                <Marker coordinate={{ latitude: 6.3000, longitude: -10.7900 }} title="Destination" pinColor="#000" />

                <Polyline
                    coordinates={[
                        { latitude: 6.3156, longitude: -10.7969 },
                        { latitude: 6.3100, longitude: -10.7940 },
                        { latitude: 6.3050, longitude: -10.7920 },
                        { latitude: 6.3000, longitude: -10.7900 },
                    ]}
                    strokeColor="#0f172a"
                    strokeWidth={4}
                />
            </MapView>

            {/* Top Floating Back Button */}
            <SafeAreaView style={styles.topBar} edges={['top']}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#0f172a" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Bottom Sheet Card Container */}
            <View style={styles.bottomCard}>
                {/* Drag Handle */}
                <View style={styles.dragHandle} />

                {/* VIEW 1: ACTIVE RIDE TRACKING (Exact Match with Image 3) */}
                {activeRide ? (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        {/* Header: Vehicle Name, Arrival ETA, License Plate & Car Image */}
                        <View style={styles.trackingHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.vehicleTitle}>
                                    {activeRide.driver?.vehicleColor || "Black"} {activeRide.driver?.vehicleModel || "Toyota Corolla"}
                                </Text>
                                <Text style={styles.arrivingEta}>arriving in 5 min</Text>
                                <View style={styles.plateBox}>
                                    <Text style={styles.plateText}>{activeRide.driver?.licensePlate || "C 3555 OE"}</Text>
                                </View>
                            </View>

                            <Image
                                source={require('../../../assets/cars/black_sedan.jpg')}
                                style={styles.trackingCarImage}
                                resizeMode="contain"
                            />
                        </View>

                        {/* Driver Profile Row */}
                        <View style={styles.driverRow}>
                            <Image
                                source={require('../../../assets/cars/driver_portrait.jpg')}
                                style={styles.driverAvatar}
                            />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.driverName}>{activeRide.driver?.user?.name || "Harry Parker"}</Text>
                                <View style={styles.ratingRow}>
                                    <Ionicons name="star" size={13} color="#f59e0b" />
                                    <Text style={styles.ratingText}>4.9</Text>
                                </View>
                            </View>

                            {/* Chat & Call Icons */}
                            <TouchableOpacity style={styles.chatIconBtn} onPress={() => Alert.alert("Chat", "Driver: I am arriving shortly!")}>
                                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#ffffff" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.callIconBtn} onPress={() => Alert.alert("Call", "Calling driver...")}>
                                <Ionicons name="call-outline" size={18} color="#0f172a" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.thinDivider} />

                        {/* Route Points with Edit Pencil Icons */}
                        <View style={styles.routeSection}>
                            {/* Pick up */}
                            <View style={styles.routeItemRow}>
                                <Ionicons name="ellipse" size={12} color="#059669" style={{ marginTop: 2 }} />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.rSubLabel}>Pick up</Text>
                                    <Text style={styles.rMainText} numberOfLines={1}>{activeRide.originAddress || pickup}</Text>
                                </View>
                                <TouchableOpacity style={styles.editBtn}>
                                    <Ionicons name="pencil" size={13} color="#475569" />
                                </TouchableOpacity>
                            </View>

                            {/* Add stop */}
                            <View style={styles.routeItemRow}>
                                <Ionicons name="add-circle-outline" size={14} color="#64748b" style={{ marginTop: 2 }} />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.rMainText}>Add stop</Text>
                                </View>
                                <TouchableOpacity style={styles.editBtn}>
                                    <Ionicons name="pencil" size={13} color="#475569" />
                                </TouchableOpacity>
                            </View>

                            {/* Destination */}
                            <View style={styles.routeItemRow}>
                                <Ionicons name="flag" size={13} color="#dc2626" style={{ marginTop: 2 }} />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.rSubLabel}>Destination</Text>
                                    <Text style={styles.rMainText} numberOfLines={1}>{activeRide.destAddress || destination}</Text>
                                </View>
                                <TouchableOpacity style={styles.editBtn}>
                                    <Ionicons name="pencil" size={13} color="#475569" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.thinDivider} />

                        {/* Share Location Toggle */}
                        <View style={styles.toggleRow}>
                            <Text style={styles.toggleText}>Share my location to driver</Text>
                            <Switch
                                value={shareLocation}
                                onValueChange={setShareLocation}
                                trackColor={{ false: '#e2e8f0', true: '#f59e0b' }}
                                thumbColor={'#ffffff'}
                            />
                        </View>

                        {/* Payment Card / MoMo Row */}
                        <View style={styles.paymentMethodRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rSubLabel}>Payment card</Text>
                                <Text style={styles.rMainText}>MasterCard ****4568</Text>
                            </View>
                            <TouchableOpacity style={styles.editBtn}>
                                <Ionicons name="pencil" size={13} color="#475569" />
                            </TouchableOpacity>
                        </View>

                        {/* Bottom Buttons: Cancel ride & New request */}
                        <View style={styles.bottomDualActions}>
                            <TouchableOpacity style={styles.cancelRideBtn} onPress={handleCancelRide}>
                                <Text style={styles.cancelRideText}>✕ Cancel ride</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.newRequestBtn} onPress={() => setActiveRide(null)}>
                                <Text style={styles.newRequestText}>+ New request</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                ) : (
                    /* VIEW 2: BOOKING SHEET (Exact Match with Image 2) */
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        {/* Route Input Box */}
                        <View style={styles.locationCard}>
                            <View style={styles.locRow}>
                                <Ionicons name="ellipse" size={10} color="#059669" />
                                <TextInput
                                    value={pickup}
                                    onChangeText={setPickup}
                                    style={styles.locInput}
                                    placeholder="Enter pickup"
                                />
                            </View>

                            <View style={styles.locDotted} />

                            <View style={styles.locRow}>
                                <Ionicons name="flag" size={12} color="#dc2626" />
                                <TextInput
                                    value={destination}
                                    onChangeText={setDestination}
                                    style={styles.locInput}
                                    placeholder="Enter destination"
                                />
                                <Text style={styles.etaText}>19 min</Text>
                                <TouchableOpacity style={styles.addStopCircle}>
                                    <Text style={styles.addStopPlus}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Category Pills: [ Transport ] [ Taxi ] [ Delivery ] */}
                        <View style={styles.pillRow}>
                            {(['Transport', 'Taxi', 'Delivery'] as const).map((mode) => (
                                <TouchableOpacity
                                    key={mode}
                                    onPress={() => setServiceMode(mode)}
                                    style={[
                                        styles.pillBtn,
                                        serviceMode === mode && styles.pillBtnActive
                                    ]}
                                >
                                    <Text style={[
                                        styles.pillText,
                                        serviceMode === mode && styles.pillTextActive
                                    ]}>
                                        {mode}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Vehicle Cards Carousel */}
                        <View style={styles.carCardsGrid}>
                            {/* Standard Card */}
                            <TouchableOpacity
                                style={[
                                    styles.vehicleCard,
                                    selectedTier === 'Standard' && styles.vehicleCardSelected
                                ]}
                                onPress={() => setSelectedTier('Standard')}
                                activeOpacity={0.9}
                            >
                                <Text style={[styles.vehicleTitleCard, selectedTier === 'Standard' && styles.textWhite]}>
                                    Standard
                                </Text>
                                <Image
                                    source={require('../../../assets/cars/white_sedan.jpg')}
                                    style={styles.cardCarImg}
                                    resizeMode="contain"
                                />
                                <Text style={[styles.priceText, selectedTier === 'Standard' && styles.textWhite]}>
                                    $ 27.00
                                </Text>
                                <Text style={[styles.timeText, selectedTier === 'Standard' && styles.textMutedWhite]}>
                                    3 min
                                </Text>
                            </TouchableOpacity>

                            {/* Comfort Card */}
                            <TouchableOpacity
                                style={[
                                    styles.vehicleCard,
                                    selectedTier === 'Comfort' && styles.vehicleCardSelected
                                ]}
                                onPress={() => setSelectedTier('Comfort')}
                                activeOpacity={0.9}
                            >
                                <Text style={[styles.vehicleTitleCard, selectedTier === 'Comfort' && styles.textWhite]}>
                                    Comfort
                                </Text>
                                <Image
                                    source={require('../../../assets/cars/red_sedan.jpg')}
                                    style={styles.cardCarImg}
                                    resizeMode="contain"
                                />
                                <Text style={[styles.priceText, selectedTier === 'Comfort' && styles.textWhite]}>
                                    $ 35.00
                                </Text>
                                <Text style={[styles.timeText, selectedTier === 'Comfort' && styles.textMutedWhite]}>
                                    8 min
                                </Text>
                            </TouchableOpacity>

                            {/* Business Card */}
                            <TouchableOpacity
                                style={[
                                    styles.vehicleCard,
                                    selectedTier === 'Business' && styles.vehicleCardSelected
                                ]}
                                onPress={() => setSelectedTier('Business')}
                                activeOpacity={0.9}
                            >
                                <Text style={[styles.vehicleTitleCard, selectedTier === 'Business' && styles.textWhite]}>
                                    Business
                                </Text>
                                <Image
                                    source={require('../../../assets/cars/black_sedan.jpg')}
                                    style={styles.cardCarImg}
                                    resizeMode="contain"
                                />
                                <Text style={[styles.priceText, selectedTier === 'Business' && styles.textWhite]}>
                                    $ 52.00
                                </Text>
                                <Text style={[styles.timeText, selectedTier === 'Business' && styles.textMutedWhite]}>
                                    15 min
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Payment Card Row */}
                        <TouchableOpacity style={styles.paymentSelector}>
                            <View style={styles.mastercardCircleRow}>
                                <View style={[styles.mcCircle, { backgroundColor: '#ef4444' }]} />
                                <View style={[styles.mcCircle, { backgroundColor: '#f59e0b', marginLeft: -8 }]} />
                            </View>
                            <Text style={styles.paymentMasked}>•••• 4568</Text>
                            <Ionicons name="chevron-forward" size={16} color="#64748b" />
                        </TouchableOpacity>

                        {/* Bottom Action: Golden Request Button + Filter Icon Button */}
                        <View style={styles.requestBottomRow}>
                            <TouchableOpacity
                                style={styles.goldenRequestBtn}
                                onPress={handleRequestRide}
                                disabled={loading}
                            >
                                <Text style={styles.goldenRequestText}>
                                    {loading ? "Requesting..." : "Request"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.filterBtn}>
                                <Ionicons name="options-outline" size={20} color="#ffffff" />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    map: {
        width: '100%',
        height: '48%',
    },
    mapPin: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapPinInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ffffff',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 20,
        zIndex: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    bottomCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 10,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e2e8f0',
        alignSelf: 'center',
        marginBottom: 12,
    },
    locationCard: {
        backgroundColor: '#ffffff',
        padding: 4,
        marginBottom: 14,
    },
    locRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    locInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0f172a',
        paddingVertical: 6,
    },
    locDotted: {
        height: 12,
        borderLeftWidth: 1.5,
        borderLeftColor: '#cbd5e1',
        borderStyle: 'dashed',
        marginLeft: 4,
        marginVertical: 2,
    },
    etaText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
    },
    addStopCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    addStopPlus: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f172a',
    },
    pillRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    pillBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
    },
    pillBtnActive: {
        backgroundColor: '#0f172a',
    },
    pillText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748b',
    },
    pillTextActive: {
        color: '#ffffff',
    },
    carCardsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    vehicleCard: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        padding: 12,
        height: 155,
        justifyContent: 'space-between',
    },
    vehicleCardSelected: {
        backgroundColor: '#18181b',
    },
    vehicleTitleCard: {
        fontSize: 12,
        fontWeight: '900',
        color: '#0f172a',
    },
    cardCarImg: {
        width: '100%',
        height: 52,
    },
    priceText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0f172a',
    },
    timeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
    },
    textWhite: {
        color: '#ffffff',
    },
    textMutedWhite: {
        color: '#a1a1aa',
    },
    paymentSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 14,
        borderRadius: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    mastercardCircleRow: {
        flexDirection: 'row',
        marginRight: 10,
    },
    mcCircle: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    paymentMasked: {
        flex: 1,
        fontSize: 13,
        fontWeight: 'bold',
        color: '#0f172a',
        fontFamily: 'monospace',
    },
    requestBottomRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    goldenRequestBtn: {
        flex: 1,
        backgroundColor: '#f59e0b',
        height: 56,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    goldenRequestText: {
        fontSize: 17,
        fontWeight: '900',
        color: '#0f172a',
    },
    filterBtn: {
        width: 56,
        height: 56,
        borderRadius: 20,
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // TRACKING STYLES (Image 3)
    trackingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    vehicleTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0f172a',
        lineHeight: 26,
    },
    arrivingEta: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
        marginTop: 4,
    },
    plateBox: {
        borderWidth: 1.5,
        borderColor: '#0f172a',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    plateText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f172a',
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    trackingCarImage: {
        width: 120,
        height: 70,
    },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    driverAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    driverName: {
        fontSize: 15,
        fontWeight: '900',
        color: '#0f172a',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 2,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    chatIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    callIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thinDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 12,
    },
    routeSection: {
        gap: 12,
    },
    routeItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rSubLabel: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        color: '#94a3b8',
    },
    rMainText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
    },
    editBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0f172a',
    },
    paymentMethodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    bottomDualActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 18,
    },
    cancelRideBtn: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelRideText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0f172a',
    },
    newRequestBtn: {
        flex: 1,
        backgroundColor: '#f59e0b',
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    newRequestText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0f172a',
    },
});
