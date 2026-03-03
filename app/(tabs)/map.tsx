import { StyleSheet, Text, View } from 'react-native';

export default function TabScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>En cours de construction 🚧</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff00',
  },
});
