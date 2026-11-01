import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ScrollView, 
  Image,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Save, Lock, Camera } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { authAPI } from '../services/api';
import { databaseService } from '../services/database';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

export default function SettingsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.customerName || '');
      setEmail(user.email || '');
      setCustomerName(user.customerName || '');
      loadProfilePicture();
    }
  }, [user]);

  const loadProfilePicture = async () => {
    if (user?.id) {
      const picture = await databaseService.getProfilePicture(user.id);
      setProfilePicture(picture);
    }
  };

  const handleSelectImage = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      includeBase64: true,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }

      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }

      if (response.assets && response.assets[0] && response.assets[0].uri) {
        const imageUri = response.assets[0].uri;
        setProfilePicture(imageUri);

        // Save to SQLite
        if (user?.id) {
          try {
            await databaseService.saveProfilePicture(user.id, imageUri);
            Alert.alert('Success', 'Profile picture updated');
          } catch (error) {
            console.error('Error saving profile picture:', error);
            Alert.alert('Error', 'Failed to save profile picture');
          }
        }
      }
    });
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const updateData: any = {};
      if (name && name !== (user.customerName || '')) updateData.customer_name = name;
      if (email && email !== user.email) updateData.email = email;

      if (Object.keys(updateData).length === 0) {
        Alert.alert('Info', 'No changes to save');
        setLoading(false);
        return;
      }

      await authAPI.updateProfile(updateData);
      
      // Update user context if email changed (need to re-login)
      if (updateData.email && updateData.email !== user.email) {
        Alert.alert(
          'Email Updated',
          'Your email has been updated. Please login again.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Logout and navigate to login
                await authAPI.logout();
                navigation.navigate('Login' as never);
              },
            },
          ]
        );
      } else {
        Alert.alert('Success', 'Profile updated successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'OK',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordForm(false);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.white }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Picture</Text>
          <View style={styles.profilePictureContainer}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.primary }]}>
                <User size={48} color={colors.white} />
              </View>
            )}
            <TouchableOpacity
              style={[styles.cameraButton, { backgroundColor: colors.solarOrange }]}
              onPress={handleSelectImage}
            >
              <Camera size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Details Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Details</Text>
          
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <User size={18} color={colors.solarOrange} />
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <Mail size={18} color={colors.solarOrange} />
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.solarOrange }]}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Save size={20} color={colors.white} />
                  <Text style={[styles.saveButtonText, { color: colors.white }]}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Change Section */}
        <View style={styles.section}>
          <View style={styles.passwordHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>
            <TouchableOpacity
              onPress={() => setShowPasswordForm(!showPasswordForm)}
              style={[styles.toggleButton, { backgroundColor: colors.card }]}
            >
              <Lock size={18} color={colors.solarOrange} />
              <Text style={[styles.toggleButtonText, { color: colors.text }]}>
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </Text>
            </TouchableOpacity>
          </View>

          {showPasswordForm && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm New Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.solarOrange }]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Lock size={20} color={colors.white} />
                    <Text style={[styles.saveButtonText, { color: colors.white }]}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#F97316',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

