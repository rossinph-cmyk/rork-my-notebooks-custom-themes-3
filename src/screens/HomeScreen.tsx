import React, { useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, Modal, TextInput, Keyboard, PanResponder, Image, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useNotebookStore } from "../state/notebookStore";
import { Ionicons } from "@expo/vector-icons";
import { NotebookModal } from "../components/NotebookModal";
import { OnboardingSlideshow } from "../components/OnboardingSlideshow";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const darkMode = useNotebookStore((s) => s.darkMode);
  const toggleDarkMode = useNotebookStore((s) => s.toggleDarkMode);
  const updateNotebook = useNotebookStore((s) => s.updateNotebook);
  const updateNotebookBackgroundImage = useNotebookStore((s) => s.updateNotebookBackgroundImage);
  const homeBackgroundImage = useNotebookStore((s) => s.homeBackgroundImage);
  const homeBackgroundImageOpacity = useNotebookStore((s) => s.homeBackgroundImageOpacity);
  const updateHomeBackgroundImage = useNotebookStore((s) => s.updateHomeBackgroundImage);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState("#E63946");
  const [originalColor, setOriginalColor] = useState("#E63946");
  const [sliderPosition, setSliderPosition] = useState(0);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [imageOpacity, setImageOpacity] = useState(0.15);
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>(undefined);
  const [showHomeImagePicker, setShowHomeImagePicker] = useState(false);
  const [homeImageOpacity, setHomeImageOpacity] = useState(0.15);
  const [selectedHomeImageUri, setSelectedHomeImageUri] = useState<string | undefined>(undefined);
  const [showFeaturesSlideshow, setShowFeaturesSlideshow] = useState(false);
  const sliderWidth = 280;

  React.useEffect(() => {
    setShowHomeImagePicker(false);
    setShowImagePicker(false);
    setShowColorPicker(false);
    setModalVisible(false);
    setEditingNameId(null);
    setShowFeaturesSlideshow(false);
  }, []);

  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const getColorFromPosition = (position: number): string => {
    const hue = position * 360;
    return hslToHex(hue, 100, 50);
  };

  const getPositionFromColor = (hexColor: string): number => {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;

    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return h;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newPosition = Math.max(0, Math.min(1, x / sliderWidth));
        setSliderPosition(newPosition);
        setSelectedColor(getColorFromPosition(newPosition));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newPosition = Math.max(0, Math.min(1, x / sliderWidth));
        setSliderPosition(newPosition);
        setSelectedColor(getColorFromPosition(newPosition));
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  const handleNotebookPress = (notebookId: string) => {
    navigation.navigate("Notebook", { notebookId });
  };

  const handleAddNotebook = () => {
    setEditingNotebook(null);
    setModalVisible(true);
  };

  const handleEditNotebook = (notebookId: string) => {
    setEditingNotebook(notebookId);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingNotebook(null);
  };

  const handleNamePress = (notebookId: string, currentName: string) => {
    setEditingNameId(notebookId);
    setEditingNameValue(currentName);
  };

  const handleNameSave = () => {
    if (editingNameId && editingNameValue.trim()) {
      updateNotebook(editingNameId, { name: editingNameValue.trim() });
    }
    setEditingNameId(null);
    setEditingNameValue("");
    Keyboard.dismiss();
  };

  const handleNameCancel = () => {
    setEditingNameId(null);
    setEditingNameValue("");
    Keyboard.dismiss();
  };

  const handleColorPress = (notebookId: string, currentColor: string) => {
    setEditingColorId(notebookId);
    setSelectedColor(currentColor);
    setOriginalColor(currentColor);
    const position = getPositionFromColor(currentColor);
    setSliderPosition(position);
    setShowColorPicker(true);
  };

  const handleSaveColor = () => {
    if (editingColorId && selectedColor) {
      updateNotebook(editingColorId, { color: selectedColor });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowColorPicker(false);
    setEditingColorId(null);
  };

  const handleCloseColorPicker = () => {
    setShowColorPicker(false);
    setEditingColorId(null);
  };

  const handleImagePress = async (notebookId: string) => {
    const notebook = notebooks.find((nb) => nb.id === notebookId);
    if (!notebook) return;

    setEditingImageId(notebookId);
    setSelectedImageUri(notebook.backgroundImage);
    setImageOpacity(notebook.backgroundImageOpacity || 0.15);
    setShowImagePicker(true);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library to select an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageUri(undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveImage = () => {
    if (editingImageId) {
      updateNotebookBackgroundImage(editingImageId, selectedImageUri, imageOpacity);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowImagePicker(false);
    setEditingImageId(null);
  };

  const handleCloseImagePicker = () => {
    setShowImagePicker(false);
    setEditingImageId(null);
  };

  const handleHomeImagePress = () => {
    setSelectedHomeImageUri(homeBackgroundImage);
    setHomeImageOpacity(homeBackgroundImageOpacity || 0.15);
    setShowHomeImagePicker(true);
  };

  const handlePickHomeImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library to select an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedHomeImageUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRemoveHomeImage = () => {
    setSelectedHomeImageUri(undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveHomeImage = () => {
    updateHomeBackgroundImage(selectedHomeImageUri, homeImageOpacity);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowHomeImagePicker(false);
  };

  const handleCloseHomeImagePicker = () => {
    setShowHomeImagePicker(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: darkMode ? "#000000" : "#FEF3C7" }]}
      edges={["top", "bottom"]}
    >
      {homeBackgroundImage && (
        <Image
          source={{ uri: homeBackgroundImage }}
          style={[styles.backgroundImage, { opacity: homeBackgroundImageOpacity || 0.15 }]}
          resizeMode="cover"
        />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: darkMode ? "#A855F7" : "#78350F" }]}>
              My Notebooks
            </Text>
            <View style={[styles.micBadge, { backgroundColor: darkMode ? "#A855F7" : "#78350F" }]}>
              <Ionicons
                name="mic"
                size={24}
                color={darkMode ? "#000000" : "#FFFFFF"}
              />
            </View>
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => {
                setShowFeaturesSlideshow(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.iconButton, { backgroundColor: darkMode ? "#1F1F1F" : "#FDE68A" }]}
            >
              <Ionicons
                name="help-circle-outline"
                size={28}
                color={darkMode ? "#A855F7" : "#78350F"}
              />
            </Pressable>
            <Pressable
              onPress={handleHomeImagePress}
              style={[styles.iconButton, { backgroundColor: darkMode ? "#1F1F1F" : "#FDE68A" }]}
            >
              <Ionicons
                name="image-outline"
                size={28}
                color={darkMode ? "#A855F7" : "#78350F"}
              />
            </Pressable>
            <Pressable
              onPress={toggleDarkMode}
              style={[styles.iconButton, { backgroundColor: darkMode ? "#1F1F1F" : "#FDE68A" }]}
            >
              <Ionicons
                name={darkMode ? "sunny" : "moon"}
                size={28}
                color={darkMode ? "#A855F7" : "#78350F"}
              />
            </Pressable>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: darkMode ? "#A855F7" : "#92400E" }]}>
          Tap to open or create a new notebook
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View style={styles.notebooksGrid}>
            {notebooks.slice(0, 2).map((notebook) => (
              <Pressable
                key={notebook.id}
                onPress={() => handleNotebookPress(notebook.id)}
                onLongPress={() => handleEditNotebook(notebook.id)}
                style={[styles.notebookCard, { backgroundColor: notebook.color }]}
              >
                {notebook.backgroundImage && (
                  <Image
                    source={{ uri: notebook.backgroundImage }}
                    style={[styles.notebookBackgroundImage, { opacity: notebook.backgroundImageOpacity || 0.15 }]}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.notebookContent}>
                  <View style={styles.notebookHeader}>
                    <Ionicons name="book-outline" size={36} color="#FFFFFF" />
                    <View style={styles.notebookActions}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleColorPress(notebook.id, notebook.color);
                        }}
                        style={styles.actionButton}
                      >
                        <Ionicons name="color-palette-outline" size={20} color="#FFFFFF" />
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleImagePress(notebook.id);
                        }}
                        style={styles.actionButton}
                      >
                        <Ionicons name="image-outline" size={20} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleNamePress(notebook.id, notebook.name)}
                    style={styles.notebookNameContainer}
                  >
                    <Text style={styles.notebookName} numberOfLines={2}>
                      {notebook.name}
                    </Text>
                  </Pressable>
                  <Text style={styles.notebookCount}>
                    {notebook.notes.length} {notebook.notes.length === 1 ? "note" : "notes"}
                  </Text>
                </View>

                <View style={styles.binderRings}>
                  {[...Array(5)].map((_, i) => (
                    <View
                      key={i}
                      style={styles.binderRing}
                    />
                  ))}
                </View>
              </Pressable>
            ))}
          </View>

          {notebooks.length > 2 && (
            <View style={styles.gridWrapper}>
              {notebooks.slice(2).map((notebook, index) => (
                <Pressable
                  key={notebook.id}
                  onPress={() => handleNotebookPress(notebook.id)}
                  onLongPress={() => handleEditNotebook(notebook.id)}
                  style={[
                    styles.notebookCardSmall,
                    { backgroundColor: notebook.color, marginRight: index % 2 === 0 ? "4%" : 0 }
                  ]}
                >
                  {notebook.backgroundImage && (
                    <Image
                      source={{ uri: notebook.backgroundImage }}
                      style={[styles.notebookBackgroundImage, { opacity: notebook.backgroundImageOpacity || 0.15 }]}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.notebookContentSmall}>
                    <View style={styles.notebookHeaderSmall}>
                      <Ionicons name="book-outline" size={32} color="#FFFFFF" />
                      <View style={styles.notebookActions}>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleColorPress(notebook.id, notebook.color);
                          }}
                          style={styles.actionButton}
                        >
                          <Ionicons name="color-palette-outline" size={18} color="#FFFFFF" />
                        </Pressable>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleImagePress(notebook.id);
                          }}
                          style={styles.actionButton}
                        >
                          <Ionicons name="image-outline" size={18} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleNamePress(notebook.id, notebook.name)}
                      style={styles.notebookNameContainer}
                    >
                      <Text style={styles.notebookName} numberOfLines={3}>
                        {notebook.name}
                      </Text>
                    </Pressable>
                    <View style={styles.notebookCountBottom}>
                      <Text style={styles.notebookCount}>
                        {notebook.notes.length} {notebook.notes.length === 1 ? "note" : "notes"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.binderRings}>
                    {[...Array(5)].map((_, i) => (
                      <View
                        key={i}
                        style={styles.binderRing}
                      />
                    ))}
                  </View>
                </Pressable>
              ))}

              <Pressable
                onPress={handleAddNotebook}
                style={[
                  styles.addNotebookButton,
                  { marginRight: notebooks.slice(2).length % 2 === 0 ? "4%" : 0 }
                ]}
              >
                <Ionicons name="add" size={48} color="#D97706" />
                <Text style={styles.addNotebookText}>New Notebook</Text>
              </Pressable>
            </View>
          )}

          {notebooks.length <= 2 && notebooks.length % 2 === 0 && (
            <View style={styles.notebooksGrid}>
              <Pressable
                onPress={handleAddNotebook}
                style={styles.addNotebookButtonWide}
              >
                <Ionicons name="add" size={48} color="#D97706" />
                <Text style={styles.addNotebookText}>New Notebook</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>

      <NotebookModal
        visible={modalVisible}
        onClose={handleCloseModal}
        notebookId={editingNotebook}
      />

      <Modal
        visible={editingNameId !== null}
        animationType="fade"
        transparent
        onRequestClose={handleNameCancel}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleNameCancel}
        >
          <Pressable
            style={styles.nameEditModal}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Edit Notebook Name</Text>
            <TextInput
              value={editingNameValue}
              onChangeText={setEditingNameValue}
              placeholder="Enter notebook name"
              style={styles.modalInput}
              placeholderTextColor="#9CA3AF"
              autoFocus
              onSubmitEditing={handleNameSave}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleNameCancel}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleNameSave}
                disabled={!editingNameValue.trim()}
                style={[styles.modalSaveButton, { opacity: !editingNameValue.trim() ? 0.5 : 1 }]}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showColorPicker}
        animationType="slide"
        transparent
        onRequestClose={handleCloseColorPicker}
      >
        <View style={styles.bottomModalContainer}>
          <View style={styles.bottomModal}>
            <View style={styles.bottomModalHeader}>
              <Text style={styles.bottomModalTitle}>Color Change</Text>
              <Pressable
                onPress={handleCloseColorPicker}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>

            <Text style={styles.bottomModalLabel}>
              Select Notebook Color
            </Text>

            <View style={styles.colorSection}>
              <Text style={styles.colorSectionLabel}>Original Color</Text>
              <Pressable
                onPress={() => {
                  setSelectedColor(originalColor);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.colorPreview,
                  {
                    backgroundColor: originalColor,
                    borderColor: selectedColor === originalColor ? "#3B82F6" : "#E5E7EB"
                  }
                ]}
              >
                <Ionicons name="book-outline" size={32} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.sliderContainer}>
              <View
                {...panResponder.panHandlers}
                style={{ width: sliderWidth, height: 60, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}
              >
                <LinearGradient
                  colors={["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: sliderPosition * sliderWidth - 3,
                    width: 6,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 3,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                  }}
                />
              </View>
            </View>

            <View style={styles.colorSection}>
              <Text style={styles.colorSectionLabel}>Preview</Text>
              <View style={[styles.colorPreviewLarge, { backgroundColor: selectedColor }]}>
                <Ionicons name="book-outline" size={48} color="#FFFFFF" />
              </View>
            </View>

            <Pressable
              onPress={handleSaveColor}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save Color</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showImagePicker}
        animationType="slide"
        transparent
        onRequestClose={handleCloseImagePicker}
      >
        <View style={styles.bottomModalContainer}>
          <View style={styles.bottomModal}>
            <View style={styles.bottomModalHeader}>
              <Text style={styles.bottomModalTitle}>Notebook Background</Text>
              <Pressable
                onPress={handleCloseImagePicker}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>

            <Text style={styles.bottomModalLabel}>
              Choose an image or color for your notebook
            </Text>

            {selectedImageUri ? (
              <View style={styles.imagePickerSection}>
                <Text style={styles.colorSectionLabel}>Selected Image</Text>
                <View style={styles.imagePreviewContainer}>
                  <View style={[styles.imagePreview, { backgroundColor: editingImageId ? notebooks.find((nb) => nb.id === editingImageId)?.color : "#E63946" }]}>
                    <Image
                      source={{ uri: selectedImageUri }}
                      style={[styles.previewImage, { opacity: imageOpacity }]}
                      resizeMode="cover"
                    />
                  </View>
                </View>

                <View style={styles.opacitySliderSection}>
                  <Text style={styles.colorSectionLabel}>
                    Transparency: {Math.round(imageOpacity * 100)}%
                  </Text>
                  <View style={styles.opacitySliderContainer}>
                    <View
                      {...PanResponder.create({
                        onStartShouldSetPanResponder: () => true,
                        onMoveShouldSetPanResponder: () => true,
                        onPanResponderGrant: (evt) => {
                          const x = evt.nativeEvent.locationX - 16;
                          const maxWidth = sliderWidth - 32;
                          const newOpacity = Math.max(0, Math.min(1, x / maxWidth));
                          setImageOpacity(newOpacity);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        },
                        onPanResponderMove: (evt) => {
                          const x = evt.nativeEvent.locationX - 16;
                          const maxWidth = sliderWidth - 32;
                          const newOpacity = Math.max(0, Math.min(1, x / maxWidth));
                          setImageOpacity(newOpacity);
                        },
                      }).panHandlers}
                      style={{ width: sliderWidth, height: 48, justifyContent: "center" }}
                    >
                      <View style={styles.opacityTrack} />
                      <View
                        style={[
                          styles.opacityThumb,
                          { left: imageOpacity * (sliderWidth - 48) }
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={handleRemoveImage}
                  style={styles.removeImageButton}
                >
                  <Text style={styles.removeImageText}>Remove Image</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.imagePickerSection}>
                <Pressable
                  onPress={handlePickImage}
                  style={styles.imagePlaceholder}
                >
                  <Ionicons name="image-outline" size={64} color="#9CA3AF" />
                  <Text style={styles.imagePlaceholderText}>
                    Select an Image
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.modalButtons}>
              {selectedImageUri && (
                <Pressable
                  onPress={handlePickImage}
                  style={styles.changeImageButton}
                >
                  <Text style={styles.changeImageText}>Change Image</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleSaveImage}
                style={[styles.modalSaveButton, !selectedImageUri && styles.modalSaveButtonFull]}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHomeImagePicker}
        animationType="slide"
        transparent
        onRequestClose={handleCloseHomeImagePicker}
      >
        <View style={styles.bottomModalContainer}>
          <View style={styles.bottomModal}>
            <View style={styles.bottomModalHeader}>
              <Text style={styles.bottomModalTitle}>Home Background</Text>
              <Pressable
                onPress={handleCloseHomeImagePicker}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>

            <Text style={styles.bottomModalLabel}>
              Choose a background image for your home screen
            </Text>

            {selectedHomeImageUri ? (
              <View style={styles.imagePickerSection}>
                <Text style={styles.colorSectionLabel}>Selected Image</Text>
                <View style={styles.imagePreviewContainer}>
                  <View style={[styles.imagePreview, { backgroundColor: darkMode ? "#000000" : "#FEF3C7" }]}>
                    <Image
                      source={{ uri: selectedHomeImageUri }}
                      style={[styles.previewImage, { opacity: homeImageOpacity }]}
                      resizeMode="cover"
                    />
                  </View>
                </View>

                <View style={styles.opacitySliderSection}>
                  <Text style={styles.colorSectionLabel}>
                    Transparency: {Math.round(homeImageOpacity * 100)}%
                  </Text>
                  <View style={styles.opacitySliderContainer}>
                    <View
                      {...PanResponder.create({
                        onStartShouldSetPanResponder: () => true,
                        onMoveShouldSetPanResponder: () => true,
                        onPanResponderGrant: (evt) => {
                          const x = evt.nativeEvent.locationX - 16;
                          const maxWidth = sliderWidth - 32;
                          const newOpacity = Math.max(0, Math.min(1, x / maxWidth));
                          setHomeImageOpacity(newOpacity);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        },
                        onPanResponderMove: (evt) => {
                          const x = evt.nativeEvent.locationX - 16;
                          const maxWidth = sliderWidth - 32;
                          const newOpacity = Math.max(0, Math.min(1, x / maxWidth));
                          setHomeImageOpacity(newOpacity);
                        },
                      }).panHandlers}
                      style={{ width: sliderWidth, height: 48, justifyContent: "center" }}
                    >
                      <View style={styles.opacityTrack} />
                      <View
                        style={[
                          styles.opacityThumb,
                          { left: homeImageOpacity * (sliderWidth - 48) }
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={handleRemoveHomeImage}
                  style={styles.removeImageButton}
                >
                  <Text style={styles.removeImageText}>Remove Image</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.imagePickerSection}>
                <Pressable
                  onPress={handlePickHomeImage}
                  style={styles.imagePlaceholder}
                >
                  <Ionicons name="image-outline" size={64} color="#9CA3AF" />
                  <Text style={styles.imagePlaceholderText}>
                    Select an Image
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.modalButtons}>
              {selectedHomeImageUri && (
                <Pressable
                  onPress={handlePickHomeImage}
                  style={styles.changeImageButton}
                >
                  <Text style={styles.changeImageText}>Change Image</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleSaveHomeImage}
                style={[styles.modalSaveButton, !selectedHomeImageUri && styles.modalSaveButtonFull]}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <OnboardingSlideshow
        visible={showFeaturesSlideshow}
        onComplete={() => setShowFeaturesSlideshow(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  micBadge: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  notebooksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  notebookCard: {
    width: '48%',
    aspectRatio: 1 / 1.6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  notebookBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  notebookContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  notebookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notebookActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  notebookNameContainer: {
    flex: 1,
  },
  notebookName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  notebookCount: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  binderRings: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 36,
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 32,
  },
  binderRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#9CA3AF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 1, height: 1 },
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  notebookCardSmall: {
    width: '48%',
    aspectRatio: 1 / 1.6,
    marginBottom: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  notebookContentSmall: {
    flex: 1,
    padding: 24,
  },
  notebookHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notebookCountBottom: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  addNotebookButton: {
    width: '48%',
    aspectRatio: 1 / 1.6,
    borderRadius: 16,
    borderWidth: 4,
    borderStyle: 'dashed',
    borderColor: '#FCD34D',
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNotebookButtonWide: {
    width: '48%',
    aspectRatio: 1 / 1.6,
    borderRadius: 16,
    borderWidth: 4,
    borderStyle: 'dashed',
    borderColor: '#FCD34D',
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNotebookText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#78350F',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  nameEditModal: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSaveButtonFull: {
    flex: 1,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  bottomModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  bottomModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  bottomModalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  colorSection: {
    marginBottom: 16,
  },
  colorSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  colorPreview: {
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  colorPreviewLarge: {
    height: 96,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imagePickerSection: {
    marginBottom: 24,
  },
  imagePreviewContainer: {
    marginBottom: 16,
  },
  imagePreview: {
    height: 192,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  opacitySliderSection: {
    marginBottom: 16,
  },
  opacitySliderContainer: {
    backgroundColor: '#E5E7EB',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  opacityTrack: {
    backgroundColor: '#D1D5DB',
    height: 8,
    borderRadius: 4,
  },
  opacityThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  removeImageButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  removeImageText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePlaceholder: {
    height: 192,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  changeImageButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
});
