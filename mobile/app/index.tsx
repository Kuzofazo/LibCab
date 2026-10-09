import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Top Indicator Dots / Bars */}
            <View style={styles.indicatorContainer}>
                <View style={styles.indicatorBarActive} />
                <View style={styles.indicatorBar} />
                <View style={styles.indicatorBar} />
            </View>

            {/* Vehicle Hero Asset Image */}
            <View style={styles.heroImageContainer}>
                <Image
                    source={require('../assets/cars/yellow_car.jpg')}
                    style={styles.heroImage}
                    resizeMode="contain"
                />
            </View>

            {/* Bottom Content Area */}
            <View style={styles.bottomSection}>
                <Text style={styles.headline}>Anytime, anywhere</Text>
                
                <Text style={styles.description}>
                    Your reliable partner for getting around the city. With our convenient taxi app, you can always reach your destination quickly and comfortably.
                </Text>

                {/* Swipe / Go Action Pill Button */}
                <TouchableOpacity
                    style={styles.goButtonTrack}
                    activeOpacity={0.85}
                    onPress={() => router.push('/(app)/rider')}
                >
                    <View style={styles.goPill}>
                        <Text style={styles.goPillText}>Go</Text>
                    </View>

                    <View style={styles.arrowTrack}>
                        <Ionicons name="chevron-forward" size={18} color="#666" />
                        <Ionicons name="chevron-forward" size={18} color="#777" />
                        <Ionicons name="chevron-forward" size={18} color="#888" />
                        <Ionicons name="chevron-forward" size={18} color="#999" />
                        <Ionicons name="chevron-forward" size={18} color="#aaa" />
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </View>
                </TouchableOpacity>

                {/* Switch to Driver Portal Option */}
                <TouchableOpacity 
                    style={styles.driverSwitchBtn}
                    onPress={() => router.push('/(app)/driver')}
                >
                    <Text style={styles.driverSwitchText}>
                        Are you an AfriCab Driver? <Text style={styles.driverSwitchBold}>Driver Portal</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'space-between',
    },
    indicatorContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 24,
        paddingTop: 16,
        alignSelf: 'center',
    },
    indicatorBarActive: {
        width: 48,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ffffff',
    },
    indicatorBar: {
        width: 48,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#333333',
    },
    heroImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginTop: 10,
    },
    heroImage: {
        width: width * 0.95,
        height: width * 0.75,
    },
    bottomSection: {
        paddingHorizontal: 28,
        paddingBottom: 36,
    },
    headline: {
        fontSize: 38,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: -0.5,
        marginBottom: 16,
    },
    description: {
        fontSize: 15,
        lineHeight: 23,
        color: '#a1a1aa',
        marginBottom: 36,
        fontWeight: '400',
    },
    goButtonTrack: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1f1f23',
        borderRadius: 32,
        padding: 6,
        paddingRight: 20,
    },
    goPill: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    goPillText: {
        fontSize: 17,
        fontWeight: '900',
        color: '#000000',
    },
    arrowTrack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    driverSwitchBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    driverSwitchText: {
        fontSize: 13,
        color: '#71717a',
    },
    driverSwitchBold: {
        color: '#f59e0b',
        fontWeight: 'bold',
    },
});
