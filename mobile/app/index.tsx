import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function LandingScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#ffffff', '#fff5f5', '#ffffff']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logo}>
                                <Text style={styles.logoText}>P</Text>
                            </View>
                        </View>
                        <Text style={styles.title}>Paye</Text>
                        <Text style={styles.subtitle}>Your ride, your way</Text>
                        <Text style={styles.description}>Choose how you want to use the app</Text>
                    </View>

                    {/* Action Cards */}
                    <View style={styles.actions}>
                        {/* Rider Card */}
                        <TouchableOpacity
                            style={[styles.card, styles.riderCard]}
                            onPress={() => router.push('/(app)/rider')}
                            activeOpacity={0.9}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.iconContainer}>
                                    <Text style={styles.iconText}>🚗</Text>
                                </View>
                                <View style={styles.cardTextContainer}>
                                    <Text style={styles.cardTitle}>Get a Ride</Text>
                                    <Text style={styles.cardDesc}>Book a car to your destination</Text>
                                </View>
                                <View style={styles.arrow}>
                                    <Text style={styles.arrowText}>→</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Driver Card */}
                        <TouchableOpacity
                            style={[styles.card, styles.driverCard]}
                            onPress={() => router.push('/(app)/driver')}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#D32F2F', '#B71C1C']}
                                style={styles.driverGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.cardContent}>
                                    <View style={[styles.iconContainer, styles.whiteIconBg]}>
                                        <Text style={styles.iconText}>💰</Text>
                                    </View>
                                    <View style={styles.cardTextContainer}>
                                        <Text style={[styles.cardTitle, styles.whiteText]}>Drive & Earn</Text>
                                        <Text style={[styles.cardDesc, styles.whiteText]}>Accept trips and make money</Text>
                                    </View>
                                    <View style={styles.arrow}>
                                        <Text style={[styles.arrowText, styles.whiteText]}>→</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Auth Links */}
                    <View style={styles.authLinks}>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Log in</Text></Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer Stats */}
                    <View style={styles.stats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>10K+</Text>
                            <Text style={styles.statLabel}>Happy Riders</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>500+</Text>
                            <Text style={styles.statLabel}>Drivers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>4.9★</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
    },
    logoContainer: {
        marginBottom: 16,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#D32F2F',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#D32F2F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#fff',
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 20,
        color: '#D32F2F',
        fontWeight: '600',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#666',
    },
    actions: {
        gap: 16,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    riderCard: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#f0f0f0',
    },
    driverCard: {
        backgroundColor: '#D32F2F',
    },
    driverGradient: {
        padding: 20,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    whiteIconBg: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    iconText: {
        fontSize: 28,
    },
    cardTextContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#000',
    },
    cardDesc: {
        fontSize: 14,
        color: '#666',
    },
    whiteText: {
        color: '#fff',
    },
    arrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    authLinks: {
        alignItems: 'center',
        marginTop: 24,
    },
    linkText: {
        fontSize: 15,
        color: '#666',
    },
    linkBold: {
        color: '#D32F2F',
        fontWeight: '700',
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        backgroundColor: '#f9f9f9',
        borderRadius: 16,
        marginTop: 24,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#e0e0e0',
    },
});
