import { ExpoRouter } from 'expo-router';

// This is the main entry point for Expo Router
export default function App() {
    const ctx = require.context('./app');
    return <ExpoRouter context={ctx} />;
}
