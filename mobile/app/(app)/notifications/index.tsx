import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';

interface NewsItem {
    id: string;
    title: string;
    description: string;
    date: string;
    image?: string;
    type: 'PROMO' | 'UPDATE' | 'ALERT';
}

const MOCK_NEWS: NewsItem[] = [
    {
        id: '1',
        title: 'New Safety Features Added!',
        description: 'We have introduced a new SOS button to keep you safe during your rides. Share your live location with emergency contacts instantly.',
        date: 'Today, 10:30 AM',
        type: 'UPDATE'
    },
    {
        id: '2',
        title: 'Enjoy 20% Off Your Next Ride',
        description: 'Use code FIRST20 on your next trip and save big. Offer valid for a limited time only.',
        date: 'Yesterday',
        type: 'PROMO'
    },
    {
        id: '3',
        title: 'Weather Alert: Heavy Rain Expected',
        description: 'Expect longer wait times due to weather conditions. Safety first!',
        date: '2 days ago',
        type: 'ALERT'
    }
];

export default function NotificationsScreen() {
    const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);

    const renderNewsItem = ({ item }: { item: NewsItem }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
                <View style={[
                    styles.badge,
                    item.type === 'PROMO' ? styles.promoBadge :
                        item.type === 'ALERT' ? styles.alertBadge : styles.updateBadge
                ]}>
                    <Text style={styles.badgeText}>{item.type}</Text>
                </View>
                <Text style={styles.date}>{item.date}</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <TouchableOpacity style={styles.readMore}>
                <Text style={styles.readMoreText}>Read more</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>News & Updates</Text>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={news}
                renderItem={renderNewsItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                        <Text style={styles.emptyTitle}>All caught up!</Text>
                        <Text style={styles.emptyText}>You'll see important updates and news here.</Text>
                    </View>
                }
            />
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
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    updateBadge: {
        backgroundColor: '#E3F2FD',
    },
    promoBadge: {
        backgroundColor: '#E8F5E9',
    },
    alertBadge: {
        backgroundColor: '#FFF3E0',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1976D2', // Adjusted per type in real scenario
    },
    date: {
        fontSize: 12,
        color: '#999',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    readMore: {
        alignSelf: 'flex-start',
    },
    readMoreText: {
        color: '#D32F2F',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
    },
});
