import { useState } from 'react';
import {
    Alert, KeyboardAvoidingView, Platform,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true); // true = Login, false = Inscription
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);

    if (isLogin) {
      // CONNEXION
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Erreur', error.message);

    } else {
      // INSCRIPTION
      if (!username || username.length < 3) {
        Alert.alert('Erreur', 'Ton pseudo doit faire au moins 3 caractères !');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        Alert.alert('Erreur', error.message);
      } else if (data.user) {
        // On crée le profil dans notre table "users"
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          username: username,
          plan: 'free',
        });
        if (profileError) Alert.alert('Erreur profil', profileError.message);
        else Alert.alert('🎉 Compte créé !', 'Vérifie tes emails pour confirmer ton compte.');
      }
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Logo / Titre */}
      <View style={styles.header}>
        <Text style={styles.logo}>🚗</Text>
        <Text style={styles.appName}>CarSpotter</Text>
        <Text style={styles.tagline}>Spot. Collect. Dominate.</Text>
      </View>

      {/* Formulaire */}
      <View style={styles.form}>
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Ton pseudo (ex: SpeedHunter_33)"
            placeholderTextColor="#555"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#555"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#555"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Bouton principal */}
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Chargement...' : isLogin ? '🔑 Se connecter' : '🚀 Créer mon compte'}
          </Text>
        </TouchableOpacity>

        {/* Switcher Login / Inscription */}
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <Text style={styles.switchLink}>
              {isLogin ? "S'inscrire" : "Se connecter"}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24 },
  
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 64 },
  appName: { fontSize: 42, fontWeight: 'bold', color: '#00ff00', letterSpacing: 2 },
  tagline: { fontSize: 14, color: '#555', marginTop: 6, letterSpacing: 1 },
  
  form: { gap: 12 },
  input: { 
    backgroundColor: '#1a1a1a', 
    borderColor: '#333', 
    borderWidth: 1,
    borderRadius: 12, 
    padding: 16, 
    color: 'white', 
    fontSize: 16 
  },
  button: { 
    backgroundColor: '#00ff00', 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: { backgroundColor: '#005500' },
  buttonText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  
  switchButton: { alignItems: 'center', marginTop: 16 },
  switchText: { color: '#555', fontSize: 14 },
  switchLink: { color: '#00ff00', fontWeight: 'bold' }
});
