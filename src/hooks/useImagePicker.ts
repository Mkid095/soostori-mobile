// useImagePicker.ts — Image picking for product form
import { useCallback } from 'react'
import { Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

export function useImagePicker(onImageSelected: (uri: string) => void) {
  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.')
      return
    }
    Alert.alert('Add Image', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const cam = await ImagePicker.requestCameraPermissionsAsync()
          if (!cam.granted) {
            Alert.alert('Permission Required', 'Please allow camera access.')
            return
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
          if (!result.canceled && result.assets[0]) {
            onImageSelected(result.assets[0].uri)
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
          if (!result.canceled && result.assets[0]) {
            onImageSelected(result.assets[0].uri)
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }, [onImageSelected])

  return { pickImage }
}
