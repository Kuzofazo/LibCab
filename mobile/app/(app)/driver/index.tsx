import {
    View,
    Text,
    StyleSheet,
    Switch,
    ScrollView,
    Alert,
    TouchableOpacity,
    Platform,
    Animated,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../utils/apiClient';
import { NotificationService } from '../../../utils/notificationService';
import { useAuth } from '../../../context/AuthContext';

export interface IncomingRideOffer {
    rideId: string;
    originAddress: string;
    destAddress: string;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    distanceKm: number;
    etaMinutes: number;
    fare: number;
    vehicleType?: string;
    rideCategory?: string;
    expiresAt: string;
    countdown: number;
}

export default function DriverHome() {
    const { user, updateUser } = useAuth();
    const [isOnline, setIsOnline] = useState(false);
    const [pushGranted, setPushGranted] = useState<boolean | null>(null);
    const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
    const [incomingOffer, setIncomingOffer] = useState<IncomingRideOffer | null>(null);
    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [settlementReceipt, setSettlementReceipt] = useState<any | null>(null);
    const [stats, setStats] = useState({ earnings: 14.50, trips: 3, hours: 2.5 });
    const [token, setToken] = useState<string | null>(null);
    const [testingPush, setTestingPush] = useState(false);

    // Password Change State
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(Boolean(user?.forcePasswordChange));
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    const handleSavePassword = async () => {
        if (!currentPass) {
            Alert.alert("Required", "Please enter your current or temporary password.");
            return;
        }
        if (newPass.length < 6) {
            Alert.alert("Weak Password", "New password must be at least 6 characters long.");
            return;
        }
        if (newPass !== confirmPass) {
            Alert.alert("Mismatch", "New password and confirmation do not match.");
            return;
        }
        if (newPass === currentPass) {
            Alert.alert("Invalid", "New password cannot be the same as your current password.");
            return;
        }

        setChangingPassword(true);
        try {
            const res = await apiClient('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: currentPass,
                    newPassword: newPass,
                    confirmPassword: confirmPass,
                }),
                skipOfflineQueue: true,
            });

            const data = await res.json();
            if (res.ok && data.success) {
                if (updateUser) {
                    await updateUser(data.user, data.token);
                }
                setCurrentPass('');
                setNewPass('');
                setConfirmPass('');
                setIsPasswordModalVisible(false);
                Alert.alert(
                    "Password Changed",
                    "Your password has been changed successfully. You can now use your new password for all future logins."
                );
            } else {
                Alert.alert(
                    "Password Update Failed",
                    data.error || "Failed to update password. Please check your current password."
                );
            }
        } catch {
            Alert.alert("Connection Error", "Could not reach server to change password. Please check your connection.");
        } finally {
            setChangingPassword(false);
        }
    };

    const progressAnim = useRef(new Animated.Value(1)).current;
    const countdownTimerRef = useRef<any>(null);
    const incomingOfferRef = useRef<IncomingRideOffer | null>(null);
    incomingOfferRef.current = incomingOffer;

    // Load auth token on startup
    useEffect(() => {
        const loadToken = async () => {
            const t = await AsyncStorage.getItem('token');
            setToken(t);
        };
        loadToken();
    }, []);

    // Set up notifications and listeners on mount
    useEffect(() => {
        let isMounted = true;

        const setupNotifications = async () => {
            const reg = await NotificationService.registerForPushNotificationsAsync();
            if (isMounted) setPushGranted(reg.granted);

            const loc = await NotificationService.requestLocationPermissionsAsync();
            if (isMounted) setLocationGranted(loc.foreground);
        };

        setupNotifications();

        // 1. Foreground Notification Received Listener
        const notificationSubscription = Notifications.addNotificationReceivedListener(
            (notification) => {
                const data = notification.request.content.data as any;
                if (data?.type === 'RIDE_REQUEST' && data?.rideId) {
                    handleNewIncomingOffer({
                        rideId: data.rideId,
                        originAddress: data.originAddress || 'Customer Pickup',
                        destAddress: data.destAddress || 'Destination',
                        originLat: data.originLat,
                        originLng: data.originLng,
                        destLat: data.destLat,
                        destLng: data.destLng,
                        distanceKm: data.distanceKm || 1.5,
                        etaMinutes: data.etaMinutes || 4,
                        fare: data.fare || 5.0,
                        vehicleType: data.vehicleType || 'Car',
                        rideCategory: data.rideCategory || 'Regular',
                        expiresAt: data.expiresAt || new Date(Date.now() + 45000).toISOString(),
                        countdown: 45,
                    });
                } else if (data?.type === 'RIDE_TAKEN' && data?.rideId) {
                    // Another driver took this ride
                    if (incomingOfferRef.current?.rideId === data.rideId) {
                        NotificationService.stopIncomingRideAlarm();
                        setIncomingOffer(null);
                        Alert.alert('Ride Claimed', 'Another driver accepted this ride request.');
                    }
                }
            }
        );

        // 2. Background Notification Response Received Listener (when driver taps notification)
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data as any;
                if (data?.type === 'RIDE_REQUEST' && data?.rideId) {
                    handleNewIncomingOffer({
                        rideId: data.rideId,
                        originAddress: data.originAddress || 'Customer Pickup',
                        destAddress: data.destAddress || 'Destination',
                        originLat: data.originLat,
                        originLng: data.originLng,
                        destLat: data.destLat,
                        destLng: data.destLng,
                        distanceKm: data.distanceKm || 1.5,
                        etaMinutes: data.etaMinutes || 4,
                        fare: data.fare || 5.0,
                        vehicleType: data.vehicleType || 'Car',
                        rideCategory: data.rideCategory || 'Regular',
                        expiresAt: data.expiresAt || new Date(Date.now() + 45000).toISOString(),
                        countdown: 45,
                    });
                }
            }
        );

        return () => {
            isMounted = false;
            notificationSubscription.remove();
            responseSubscription.remove();
            NotificationService.stopIncomingRideAlarm();
        };
    }, []);

    // Handle receiving a new ride offer (starts audible alarm, vibration, and animated countdown)
    const handleNewIncomingOffer = useCallback((offer: IncomingRideOffer) => {
        // Only trigger if online and not currently on an active trip
        if (activeTrip) return;

        setIncomingOffer(offer);
        NotificationService.startIncomingRideAlarm();

        // Reset and start countdown progress animation
        progressAnim.setValue(1);
        Animated.timing(progressAnim, {
            toValue: 0,
            duration: 45000,
            useNativeDriver: false,
        }).start();

        // Clear any previous countdown timer
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
        }

        let secondsLeft = 45;
        countdownTimerRef.current = setInterval(() => {
            secondsLeft -= 1;
            if (secondsLeft <= 0) {
                clearInterval(countdownTimerRef.current);
                NotificationService.stopIncomingRideAlarm();
                setIncomingOffer(null);
            } else {
                setIncomingOffer((prev) => (prev ? { ...prev, countdown: secondsLeft } : null));
            }
        }, 1000);
    }, [activeTrip, progressAnim]);

    // Check for pending offers when going online
    const checkPendingOffers = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiClient('/api/driver/pending-offers');
            if (res.ok) {
                const data = await res.json();
                if (data.offers && data.offers.length > 0 && !activeTrip) {
                    const topOffer = data.offers[0];
                    handleNewIncomingOffer({
                        rideId: topOffer.rideId,
                        originAddress: topOffer.ride.originAddress,
                        destAddress: topOffer.ride.destAddress,
                        originLat: topOffer.ride.originLat,
                        originLng: topOffer.ride.originLng,
                        destLat: topOffer.ride.destLat,
                        destLng: topOffer.ride.destLng,
                        distanceKm: topOffer.distanceKm || 1.2,
                        etaMinutes: topOffer.etaMinutes || 3,
                        fare: topOffer.ride.fare || 5.0,
                        vehicleType: topOffer.ride.vehicleType,
                        rideCategory: topOffer.ride.rideCategory,
                        expiresAt: topOffer.expiresAt,
                        countdown: topOffer.remainingSeconds || 30,
                    });
                }
            }
        } catch {}
    }, [token, activeTrip, handleNewIncomingOffer]);

    // Broadcast live location while driver is online
    useEffect(() => {
        if (!isOnline || !token) return;

        let isCancelled = false;

        const broadcastLocation = async () => {
            try {
                let coords = { lat: 6.3156, lng: -10.8074, speed: 0, heading: 0 };
                try {
                    const loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    coords = {
                        lat: loc.coords.latitude,
                        lng: loc.coords.longitude,
                        speed: loc.coords.speed ? loc.coords.speed * 3.6 : 0,
                        heading: loc.coords.heading || 0,
                    };
                } catch {
                    // Fallback to last known position
                }

                if (!isCancelled) {
                    await apiClient('/api/driver/location', {
                        method: 'POST',
                        body: JSON.stringify(coords),
                    });
                }
            } catch {}
        };

        broadcastLocation();
        const interval = setInterval(broadcastLocation, 12000);

        return () => {
            isCancelled = true;
            clearInterval(interval);
        };
    }, [isOnline, token]);

    // Toggle Online Status
    const handleToggleOnline = async (val: boolean) => {
        setIsOnline(val);
        if (val) {
            // Register push notification token & permissions
            NotificationService.registerForPushNotificationsAsync().then((res) => {
                setPushGranted(res.granted);
            });
            checkPendingOffers();
        } else {
            // Stop any ongoing alert alarm
            NotificationService.stopIncomingRideAlarm();
            setIncomingOffer(null);
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

            // Notify backend driver is offline
            try {
                await apiClient('/api/driver/profile', {
                    method: 'PATCH',
                    body: JSON.stringify({ isOnline: false }),
                });
            } catch {}
        }
    };

    // Accept Ride Offer (Atomic & Concurrency-Safe)
    const handleAcceptOffer = async () => {
        if (!incomingOffer) return;
        NotificationService.stopIncomingRideAlarm();
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

        const currentRideId = incomingOffer.rideId;
        const offerBackup = incomingOffer;
        setIncomingOffer(null);

        try {
            const res = await apiClient('/api/rides/accept', {
                method: 'POST',
                body: JSON.stringify({
                    rideId: currentRideId,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setActiveTrip(data.ride || offerBackup);
                Alert.alert('✅ Ride Accepted!', 'Head towards the passenger pickup point.');
            } else if (res.status === 409 || data.code === 'ALREADY_TAKEN') {
                Alert.alert('Trip Claimed', 'Another nearby driver accepted this ride first.');
            } else {
                Alert.alert('Acceptance Error', data.error || 'Failed to accept trip request.');
            }
        } catch {
            Alert.alert('Network Error', 'Please check your connection and try again.');
        }
    };

    // Decline Ride Offer
    const handleDeclineOffer = async () => {
        if (!incomingOffer) return;
        NotificationService.stopIncomingRideAlarm();
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

        const currentRideId = incomingOffer.rideId;
        setIncomingOffer(null);

        try {
            await apiClient('/api/rides/decline', {
                method: 'POST',
                body: JSON.stringify({ rideId: currentRideId }),
            });
        } catch {}
    };

    // Cancel Active Trip
    const handleCancelTrip = () => {
        Alert.alert(
            'Cancel Trip',
            'Are you sure you want to cancel this trip? It will be re-offered to other nearby drivers.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiClient('/api/rides', {
                                method: 'PATCH',
                                body: JSON.stringify({
                                    id: activeTrip.id,
                                    status: 'REQUESTED',
                                    driverId: null,
                                }),
                            });
                            setActiveTrip(null);
                            setIsOnline(true);
                            Alert.alert('Trip Cancelled', 'You are back online and available for new rides.');
                        } catch {
                            Alert.alert('Error', 'Failed to cancel trip.');
                        }
                    },
                },
            ]
        );
    };

    // End Trip and Issue Receipt
    const handleCompleteTrip = async () => {
        const fareVal = activeTrip?.fare || 5.0;
        try {
            await apiClient('/api/rides', {
                method: 'PATCH',
                body: JSON.stringify({
                    id: activeTrip.id,
                    status: 'COMPLETED',
                    paymentStatus: 'PAID',
                }),
            });

            setSettlementReceipt({
                id: activeTrip.id,
                passengerName: activeTrip.rider?.name || activeTrip.guestName || 'Passenger',
                payerPhone: activeTrip.customerPaymentPhone || activeTrip.rider?.phone || '+231 88 123 4567',
                origin: activeTrip.originAddress || 'Broad Street',
                destination: activeTrip.destAddress || 'Tubman Blvd',
                fare: fareVal,
                netPayout: fareVal * 0.85,
                driverPhone: '+231 88 012 3456 (MoMo Account)',
                date: new Date().toLocaleString(),
            });

            setStats((prev) => ({
                ...prev,
                earnings: prev.earnings + fareVal * 0.85,
                trips: prev.trips + 1,
            }));

            setActiveTrip(null);
            setIsOnline(true);
        } catch {
            Alert.alert('Error', 'Failed to complete trip.');
        }
    };

    // Test Push Notification Diagnostics
    const handleTestPushNotification = async () => {
        setTestingPush(true);
        try {
            const res = await apiClient('/api/driver/push-test', {
                method: 'POST',
                body: JSON.stringify({
                    customMessage: 'AfriCab Driver Test: Background audio & vibration active.',
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                Alert.alert(
                    '🔔 Test Push Dispatched!',
                    'High-priority push alert sent to your device. Minimize the app or lock the screen to verify system banner and chime.'
                );
            } else {
                Alert.alert('Push Test Notice', data.error || 'Failed to dispatch test notification.');
            }
        } catch {
            Alert.alert('Error', 'Failed to reach server for push test.');
        } finally {
            setTestingPush(false);
        }
    };

    // Render Settlement Receipt View
    if (settlementReceipt) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Trip Receipt</Text>
                    <Text style={styles.greeting}>AFRICAB DRIVER PAY</Text>
                </View>

                <ScrollView contentContainerStyle={styles.receiptContent}>
                    <View style={styles.receiptCard}>
                        <View style={styles.receiptBadgeHeader}>
                            <Ionicons name="checkmark-circle" size={48} color="#059669" />
                            <Text style={styles.receiptBadgeTitle}>Trip Completed &amp; Settled</Text>
                            <Text style={styles.receiptRefText}>Trip #{settlementReceipt.id.slice(-6).toUpperCase()}</Text>
                        </View>

                        <View style={styles.receiptAmountBox}>
                            <Text style={styles.receiptAmountLabel}>Net Payout (85%)</Text>
                            <Text style={styles.receiptAmountValue}>${settlementReceipt.netPayout.toFixed(2)}</Text>
                            <Text style={styles.receiptAmountLRD}>L$ {(settlementReceipt.netPayout * 185).toLocaleString()}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Total Customer Fare</Text>
                            <Text style={styles.receiptValue}>${settlementReceipt.fare.toFixed(2)}</Text>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Platform Commission (15%)</Text>
                            <Text style={styles.receiptValue}>-${(settlementReceipt.fare * 0.15).toFixed(2)}</Text>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Passenger</Text>
                            <Text style={styles.receiptValue}>{settlementReceipt.passengerName}</Text>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Settlement Destination</Text>
                            <Text style={[styles.receiptValue, styles.monoText]}>{settlementReceipt.driverPhone}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.locationBlock}>
                            <Text style={styles.locationLabel}>Pickup</Text>
                            <Text style={styles.locationText}>{settlementReceipt.origin}</Text>
                            <View style={{ height: 8 }} />
                            <Text style={styles.locationLabel}>Dropoff</Text>
                            <Text style={styles.locationText}>{settlementReceipt.destination}</Text>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.doneBtn}
                        onPress={() => setSettlementReceipt(null)}
                    >
                        <Text style={styles.doneBtnText}>Ready for Next Ride</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>AfriCab Driver Partner</Text>
                    <Text style={styles.name}>{user?.name ? user.name.split(' ')[0] : 'Welcome'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                        onPress={() => setIsPasswordModalVisible(true)}
                        style={styles.keyButton}
                        accessibilityLabel="Change Password"
                    >
                        <Ionicons name="key-outline" size={18} color="#0f172a" />
                    </TouchableOpacity>
                    <View style={[styles.statusContainer, activeTrip && { opacity: 0.5 }]}>
                        <Text style={[styles.statusText, isOnline && styles.onlineText]}>
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </Text>
                        <Switch
                            value={isOnline}
                            onValueChange={handleToggleOnline}
                            disabled={!!activeTrip}
                            trackColor={{ false: '#e2e8f0', true: '#059669' }}
                            thumbColor={'#ffffff'}
                        />
                    </View>
                </View>
            </View>

            {/* Temporary Password Alert Banner */}
            {user?.forcePasswordChange && (
                <TouchableOpacity
                    style={styles.forcePasswordBanner}
                    onPress={() => setIsPasswordModalVisible(true)}
                >
                    <Ionicons name="warning-outline" size={18} color="#92400e" />
                    <Text style={styles.forcePasswordBannerText}>
                        Initial password active. Tap to set your personal password.
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#92400e" />
                </TouchableOpacity>
            )}

            {/* Notification Permission Banner if not enabled */}
            {pushGranted === false && (
                <TouchableOpacity
                    style={styles.permissionWarning}
                    onPress={() => NotificationService.registerForPushNotificationsAsync().then((r) => setPushGranted(r.granted))}
                >
                    <Ionicons name="notifications-off" size={18} color="#b91c1c" />
                    <Text style={styles.permissionWarningText}>
                        Push notifications disabled. Tap to enable audible ride alerts.
                    </Text>
                </TouchableOpacity>
            )}

            {/* Active Mission View */}
            {activeTrip ? (
                <View style={styles.activeTripCard}>
                    <View style={styles.tripHeader}>
                        <Text style={styles.tripStatus}>ACTIVE TRIP</Text>
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
                            <Text style={styles.secondaryFare}>L$ {((activeTrip.fare || 5.0) * 185).toLocaleString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.statLabel}>Net Payout (85%)</Text>
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
                incomingOffer ? (
                    /* High-Priority Incoming Ride Request Card */
                    <View style={styles.requestCard}>
                        {/* Countdown Header */}
                        <View style={styles.countdownRow}>
                            <View style={styles.badgePulse}>
                                <Text style={styles.badgePulseText}>🚨 NEW RIDE REQUEST</Text>
                            </View>
                            <Text style={styles.countdownNumber}>{incomingOffer.countdown}s</Text>
                        </View>

                        {/* Animated Countdown Progress Bar */}
                        <View style={styles.progressBarBg}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: progressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%'],
                                        }),
                                    },
                                ]}
                            />
                        </View>

                        {/* Route Details */}
                        <View style={styles.routeContainer}>
                            <Text style={styles.label}>PICKUP LOCATION</Text>
                            <View style={styles.addressRow}>
                                <Ionicons name="location" size={16} color="#059669" />
                                <Text style={styles.address}>{incomingOffer.originAddress}</Text>
                            </View>

                            <View style={styles.connector} />

                            <Text style={styles.label}>DESTINATION</Text>
                            <View style={styles.addressRow}>
                                <Ionicons name="navigate" size={16} color="#dc2626" />
                                <Text style={styles.address}>{incomingOffer.destAddress}</Text>
                            </View>
                        </View>

                        {/* Proximity & Fare Details */}
                        <View style={styles.fareContainer}>
                            <View>
                                <Text style={styles.statLabel}>Estimated Fare</Text>
                                <Text style={styles.fare}>${Number(incomingOffer.fare || 5).toFixed(2)}</Text>
                                <Text style={styles.secondaryFare}>
                                    L$ {(Number(incomingOffer.fare || 5) * 185).toLocaleString()}
                                </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.statLabel}>Distance to Pickup</Text>
                                <Text style={styles.distanceValue}>{incomingOffer.distanceKm.toFixed(1)} km</Text>
                                <Text style={styles.etaText}>~{incomingOffer.etaMinutes} mins away</Text>
                            </View>
                        </View>

                        {/* Action Buttons: Accept & Decline */}
                        <View style={styles.offerActionRow}>
                            <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineOffer}>
                                <Text style={styles.declineText}>Decline</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptOffer}>
                                <Ionicons name="checkmark-sharp" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                                <Text style={styles.acceptText}>Accept Ride</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    /* Waiting Radar View */
                    <View style={styles.waitingContainer}>
                        <View style={styles.radar}>
                            <Ionicons name="radio-outline" size={44} color="#059669" />
                        </View>
                        <Text style={styles.waitingTitle}>Online &amp; Matching Nearby Rides</Text>
                        <Text style={styles.waitingText}>
                            Your GPS location is live. When a passenger requests a ride in your service radius, your phone will alert you instantly.
                        </Text>

                        {/* Background push status badge */}
                        <View style={styles.pushStatusCard}>
                            <Ionicons name="shield-checkmark" size={16} color="#059669" />
                            <Text style={styles.pushStatusText}>
                                Background Alerts Active • Phone will chime even when locked
                            </Text>
                        </View>

                        {/* Test Push Button for live verification */}
                        <TouchableOpacity
                            style={styles.testPushBtn}
                            onPress={handleTestPushNotification}
                            disabled={testingPush}
                        >
                            <Ionicons name="notifications" size={16} color="#0f172a" />
                            <Text style={styles.testPushText}>
                                {testingPush ? 'Sending Test Alert...' : 'Test Background Chime & Vibration'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )
            ) : (
                /* Offline Stats View */
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

                    <View style={styles.offlineNoticeBox}>
                        <Ionicons name="power" size={24} color="#64748b" />
                        <Text style={styles.offlineNoticeTitle}>You are currently Offline</Text>
                        <Text style={styles.offlineNoticeText}>
                            Switch the toggle at top right to Go Online and start receiving passenger ride notifications.
                        </Text>
                    </View>

                    {/* Change Password Tile */}
                    <TouchableOpacity
                        style={styles.changePasswordTile}
                        onPress={() => setIsPasswordModalVisible(true)}
                    >
                        <View style={styles.changePasswordTileLeft}>
                            <View style={styles.changePasswordIconBox}>
                                <Ionicons name="lock-closed" size={18} color="#059669" />
                            </View>
                            <View>
                                <Text style={styles.changePasswordTitle}>Change Account Password</Text>
                                <Text style={styles.changePasswordSubtitle}>Update initial or current password</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* Change Password Modal */}
            <Modal
                visible={isPasswordModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    if (!user?.forcePasswordChange) setIsPasswordModalVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={styles.modalIconBox}>
                                    <Ionicons name="key" size={20} color="#059669" />
                                </View>
                                <View>
                                    <Text style={styles.modalTitle}>Change Password</Text>
                                    <Text style={styles.modalSubtitle}>Driver Account Security</Text>
                                </View>
                            </View>
                            {!user?.forcePasswordChange && (
                                <TouchableOpacity onPress={() => setIsPasswordModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#64748b" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView contentContainerStyle={styles.modalBody}>
                            {user?.forcePasswordChange && (
                                <View style={styles.modalAlertNotice}>
                                    <Ionicons name="information-circle" size={18} color="#92400e" />
                                    <Text style={styles.modalAlertText}>
                                        An initial password was assigned by the System Administrator. Please verify your current password and create a new personal password.
                                    </Text>
                                </View>
                            )}

                            {/* Current Password */}
                            <Text style={styles.inputLabel}>CURRENT / INITIAL PASSWORD</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Enter current password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showCurrentPass}
                                    value={currentPass}
                                    onChangeText={setCurrentPass}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowCurrentPass(!showCurrentPass)}
                                    style={styles.eyeBtn}
                                >
                                    <Ionicons
                                        name={showCurrentPass ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="#64748b"
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* New Password */}
                            <Text style={styles.inputLabel}>NEW PASSWORD (MIN. 6 CHARACTERS)</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Enter new strong password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showNewPass}
                                    value={newPass}
                                    onChangeText={setNewPass}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowNewPass(!showNewPass)}
                                    style={styles.eyeBtn}
                                >
                                    <Ionicons
                                        name={showNewPass ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="#64748b"
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Confirm New Password */}
                            <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Re-enter new password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showConfirmPass}
                                    value={confirmPass}
                                    onChangeText={setConfirmPass}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPass(!showConfirmPass)}
                                    style={styles.eyeBtn}
                                >
                                    <Ionicons
                                        name={showConfirmPass ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="#64748b"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalBtnRow}>
                                {!user?.forcePasswordChange && (
                                    <TouchableOpacity
                                        style={styles.modalCancelBtn}
                                        onPress={() => setIsPasswordModalVisible(false)}
                                        disabled={changingPassword}
                                    >
                                        <Text style={styles.modalCancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.modalSaveBtn, changingPassword && { opacity: 0.7 }]}
                                    onPress={handleSavePassword}
                                    disabled={changingPassword}
                                >
                                    {changingPassword ? (
                                        <ActivityIndicator color="#ffffff" />
                                    ) : (
                                        <Text style={styles.modalSaveBtnText}>Update Password</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
        borderBottomColor: '#f1f5f9',
    },
    title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    greeting: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: '800' },
    name: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    statusContainer: { alignItems: 'flex-end' },
    statusText: { fontSize: 10, fontWeight: 'bold', marginBottom: 2, color: '#64748b' },
    onlineText: { color: '#059669', fontWeight: '900' },
    permissionWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#fee2e2',
    },
    permissionWarningText: { fontSize: 12, color: '#b91c1c', fontWeight: '700', flex: 1 },
    statsContainer: { padding: 20 },
    statCard: {
        backgroundColor: '#f8fafc',
        padding: 20,
        borderRadius: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statRow: { flexDirection: 'row', gap: 12 },
    statLabel: { fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    secondaryFare: { fontSize: 13, fontWeight: '800', color: '#059669', marginTop: 2 },
    waitingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    radar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#ecfdf5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#a7f3d0',
    },
    waitingTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
    waitingText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    pushStatusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        marginBottom: 16,
    },
    pushStatusText: { fontSize: 11, fontWeight: '700', color: '#166534' },
    testPushBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    testPushText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
    offlineNoticeBox: {
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 24,
        borderRadius: 20,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    offlineNoticeTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 10, marginBottom: 4 },
    offlineNoticeText: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 },

    // Incoming Request Card
    requestCard: {
        margin: 16,
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 20,
        borderWidth: 2,
        borderColor: '#059669',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    countdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badgePulse: {
        backgroundColor: '#fef2f2',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fca5a5',
    },
    badgePulseText: { fontSize: 11, fontWeight: '900', color: '#dc2626' },
    countdownNumber: { fontSize: 20, fontWeight: '900', color: '#dc2626' },
    progressBarBg: {
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#059669',
        borderRadius: 3,
    },
    routeContainer: { width: '100%', marginBottom: 14 },
    label: { color: '#94a3b8', fontSize: 10, fontWeight: '800', marginBottom: 2 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    address: { color: '#0f172a', fontSize: 14, fontWeight: '800', flex: 1 },
    connector: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
    fareContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    fare: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
    distanceValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
    etaText: { color: '#059669', fontSize: 11, fontWeight: '800' },
    offerActionRow: { flexDirection: 'row', gap: 12 },
    declineBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    declineText: { color: '#475569', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
    acceptBtn: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#059669',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    acceptText: { color: '#ffffff', fontWeight: '900', fontSize: 14, textTransform: 'uppercase' },

    // Active Trip View
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
        elevation: 3,
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

    // Receipt View
    receiptContent: { padding: 20 },
    receiptCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
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
    monoText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    locationBlock: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    locationLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 },
    locationText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff' },
    doneBtn: { backgroundColor: '#0f172a', height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    doneBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900', textTransform: 'uppercase' },

    // Driver Password Styles
    keyButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    forcePasswordBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fef3c7',
        borderBottomWidth: 1,
        borderBottomColor: '#fde68a',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    forcePasswordBannerText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#92400e',
        flex: 1,
    },
    changePasswordTile: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginTop: 14,
    },
    changePasswordTileLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    changePasswordIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    changePasswordTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0f172a',
    },
    changePasswordSubtitle: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 1,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        overflow: 'hidden',
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#0f172a',
    },
    modalIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(5, 150, 105, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#ffffff',
    },
    modalSubtitle: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94a3b8',
    },
    modalBody: {
        padding: 20,
    },
    modalAlertNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        padding: 12,
        borderRadius: 14,
        marginBottom: 16,
    },
    modalAlertText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#92400e',
        flex: 1,
        lineHeight: 16,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#475569',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    passwordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        marginBottom: 14,
        paddingHorizontal: 12,
    },
    modalInput: {
        flex: 1,
        height: 48,
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
    eyeBtn: {
        padding: 6,
    },
    modalBtnRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    modalCancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#475569',
        textTransform: 'uppercase',
    },
    modalSaveBtn: {
        flex: 2,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#059669',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    modalSaveBtnText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#ffffff',
        textTransform: 'uppercase',
    },
});
