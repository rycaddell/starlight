import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './client';

export const signInWithAccessCode = async (accessCode) => {
  console.log('🧪 DEBUG: signInWithAccessCode called with:', accessCode);
  
  try {
    console.log(`🔑 Custom auth: Signing in with code: ${accessCode}`);
    
    // Look up user by access code
    const { data: user, error: lookupError } = await supabase
      .from('users')
      .select('*')
      .eq('access_code', accessCode.toLowerCase())
      .eq('status', 'active')
      .single();
    
    if (lookupError) {
      if (lookupError.code === 'PGRST116') {
        return { 
          success: false, 
          error: 'Access code not found. Please check your code and try again.' 
        };
      }
      throw lookupError;
    }

    // Store user data locally
    await AsyncStorage.setItem('starlight_current_user', JSON.stringify(user));
    await AsyncStorage.setItem('starlight_access_code', accessCode.toLowerCase());
    
    console.log('✅ Custom auth: Sign-in successful');
    return { 
      success: true, 
      user: user,
      displayName: user.display_name
    };
    
  } catch (error) {
    console.error('Error signing in with access code:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to sign in. Please try again.' 
    };
  }
}; // <- This closing brace was missing!

export const getCurrentUser = async () => {
  try {
    const storedUser = await AsyncStorage.getItem('starlight_current_user');
    
    if (!storedUser) {
      return { success: false, error: 'No user found' };
    }
    
    const user = JSON.parse(storedUser);
    
    // Verify user still exists and is active
    const { data: verifiedUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('status', 'active')
      .single();
    
    if (error || !verifiedUser) {
      // User no longer exists or is inactive - clear storage
      await clearStoredAccessCode();
      return { success: false, error: 'User session expired' };
    }
    
    return { success: true, user: verifiedUser };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { success: false, error: error.message };
  }
};

export const autoSignInWithStoredCode = async () => {
  try {
    const storedCode = await AsyncStorage.getItem('starlight_access_code');
    
    if (!storedCode) {
      return { success: false, error: 'No stored access code found' };
    }
    
    console.log('🔄 Auto-signing in with stored code...');
    return await signInWithAccessCode(storedCode);
    
  } catch (error) {
    console.error('Error auto-signing in:', error);
    return { success: false, error: error.message };
  }
};

export const clearStoredAccessCode = async () => {
  try {
    await AsyncStorage.removeItem('starlight_current_user');
    await AsyncStorage.removeItem('starlight_access_code');
    
    console.log('🚪 Signed out and cleared stored data');
    return { success: true };
  } catch (error) {
    console.error('Error clearing access code:', error);
    return { success: false, error: error.message };
  }
};

export const createAccessCode = async (accessCode, displayName, groupName = null) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          access_code: accessCode.toLowerCase(),
          display_name: displayName,
          group_name: groupName
        }
      ])
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Created access code: ${accessCode} for ${displayName}`);
    return { success: true, data };
    
  } catch (error) {
    console.error('Error creating access code:', error);
    return { success: false, error: error.message };
  }
};