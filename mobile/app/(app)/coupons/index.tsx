import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';

interface Coupon {
    code: string;
    discount: string;
    description: string;
    expiry: string;
    isActive: boolean;
}

const MOCK_COUPONS: Coupon[] = [
    {
        code: 'FIRST20',
        discount: '20% OFF',
        description: 'First ride discount',
        expiry: 'Dec 31, 2024',
        isActive: true
    },
    {
        code: 'WEEKEND15',
        discount: '15% OFF',
        description: 'Weekend special',
        expiry: 'Jan 15, 2025',
        isActive: true
    },
    {
        code: 'SAVE10',
        discount: '$10 OFF',
        description: 'Save on your next ride',
        expiry: 'Feb 28, 2025',
        isActive: false
    }
];

export default function CouponsScreen() {
    const [couponCode, setCouponCode] = useState('');
    const [coupons, setCoupons] = useState<Coupon[]>(MOCK_COUPONS);

    const handleApplyCoupon = () => {
        if (!couponCode.trim()) {
            Alert.alert('Error', 'Please enter a coupon code');
            return;
        }

        const found = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase());

        if (found) {
            Alert.alert(
                '✅ Coupon Applied!',
                `${found.discount} discount will be applied to your next ride.`
            );
            setCouponCode('');
        } else {
            Alert.alert('Invalid Coupon', 'This coupon code is not valid or has expired.');
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Discount Coupons</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Apply Coupon Section */}
                <View style={styles.applySection}>
                    <Text style={styles.sectionTitle}>Have a coupon code?</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter coupon code"
                            placeholderTextColor="#999"
                            value={couponCode}
                            onChangeText={setCouponCode}
                            autoCapitalize="characters"
                        />
                        <TouchableOpacity style={styles.applyButton} onPress={handleApplyCoupon}>
                            <Text style={styles.applyButtonText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Available Coupons */}
                <View style={styles.couponsSection}>
                    <Text style={styles.sectionTitle}>Available Coupons</Text>
                    {coupons.map((coupon, index) => (
                        <View key={index} style={[styles.couponCard, !coupon.isActive && styles.inactiveCoupon]}>
                            <View style={styles.couponLeft}>
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>{coupon.discount}</Text>
                                </View>
                            </View>
                            <View style={styles.couponRight}>
                                <Text style={styles.couponCode}>{coupon.code}</Text>
                                <Text style={styles.couponDescription}>{coupon.description}</Text>
                                <Text style={styles.couponExpiry}>Valid until {coupon.expiry}</Text>
                                {coupon.isActive && (
                                    <TouchableOpacity
                                        style={styles.copyButton}
                                        onPress={() => {
                                            setCouponCode(coupon.code);
                                            Alert.alert('Copied!', `Code "${coupon.code}" copied to input`);
                                        }}
                                    >
                                        <Text style={styles.copyButtonText}>Copy Code</Text>
                                    </TouchableOpacity>
                                )}
                                {!coupon.isActive && (
                                    <View style={styles.usedBadge}>
                                        <Text style={styles.usedText}>Already Used</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Info */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                    <Text style={styles.infoText}>
                        Coupons are automatically applied at checkout. Only one coupon can be used per ride.
                    </Text>
                </View>
            </ScrollView>
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
    content: {
        flex: 1,
    },
    applySection: {
        backgroundColor: '#fff',
        padding: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        fontWeight: '600',
    },
    applyButton: {
        backgroundColor: '#D32F2F',
        borderRadius: 12,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    couponsSection: {
        padding: 20,
        paddingTop: 0,
    },
    couponCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    inactiveCoupon: {
        opacity: 0.6,
    },
    couponLeft: {
        width: 100,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRightWidth: 2,
        borderRightColor: '#f0f0f0',
        borderStyle: 'dashed',
    },
    discountBadge: {
        backgroundColor: '#D32F2F',
        borderRadius: 12,
        padding: 12,
    },
    discountText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    couponRight: {
        flex: 1,
        padding: 16,
    },
    couponCode: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D32F2F',
        marginBottom: 4,
    },
    couponDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    couponExpiry: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12,
    },
    copyButton: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 8,
        alignSelf: 'flex-start',
    },
    copyButtonText: {
        color: '#D32F2F',
        fontSize: 13,
        fontWeight: '600',
    },
    usedBadge: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 8,
        alignSelf: 'flex-start',
    },
    usedText: {
        color: '#999',
        fontSize: 13,
        fontWeight: '600',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#E3F2FD',
        margin: 20,
        marginTop: 8,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoIcon: {
        fontSize: 20,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#1976D2',
        lineHeight: 20,
    },
});
