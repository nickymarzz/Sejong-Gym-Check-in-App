import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';

export default function LoginScreen() {
  const { login, loading } = useContext(AuthContext);
  const { theme, isDark, toggleTheme } = useTheme();
  const [studentId, setStudentId] = useState('20241234');
  const [password, setPassword] = useState('password');
  const [errorMsg, setErrorMsg] = useState('');

  const canSubmit = studentId.length === 8 && password.length > 0 && !loading;

  const handleSubmit = async () => {
    setErrorMsg('');
    const r = await login(studentId, password);
    if (!r.success) {
      setErrorMsg(r.message || 'Login failed');
      if (r.message) Alert.alert('Login Notice', r.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenWrapper scroll={false}>
        <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
          <Pressable
            onPress={toggleTheme}
            style={({ pressed }) => [
              {
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
            accessibilityLabel="Toggle light or dark theme"
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon-outline'}
              size={18}
              color={isDark ? '#f59e0b' : theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.inner}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.header}>
              <View style={styles.logo}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.title, { color: theme.colors.text }]}>Sejong Gym Check-in</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Sign in with your student account</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.group}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Student ID</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.bg, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="e.g. 20241234"
                  placeholderTextColor={theme.colors.textMuted}
                  value={studentId}
                  maxLength={8}
                  keyboardType="number-pad"
                  onChangeText={(t) => setStudentId(t.replace(/\D/g, ''))}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.group}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.bg, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {errorMsg ? (
                <Text style={styles.errMsg}>{errorMsg}</Text>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={{ borderRadius: theme.radius.md }}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.submitBtn, { opacity: canSubmit ? 1 : 0.6 }]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                  ) : null}
                  <Text style={styles.submitText}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxxl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.lg,
  },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 56,
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoImg: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  form: { gap: 16 },
  group: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  errMsg: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: theme.fontWeight.semibold,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...theme.shadow.md,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: theme.fontWeight.extrabold,
    letterSpacing: 0.6,
  },
});
