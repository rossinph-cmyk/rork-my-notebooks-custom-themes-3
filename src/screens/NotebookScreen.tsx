import React, { useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert, Share, Modal, PanResponder, Linking, ActionSheetIOS, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useNotebookStore } from "../state/notebookStore";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { transcribeAudio } from "../api/transcribe-audio";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";

type NotebookScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Notebook">;
type NotebookScreenRouteProp = RouteProp<RootStackParamList, "Notebook">;

interface NotebookScreenProps {
  navigation: NotebookScreenNavigationProp;
  route: NotebookScreenRouteProp;
}

export const NotebookScreen: React.FC<NotebookScreenProps> = ({ navigation, route }) => {
  const { notebookId } = route.params;
  const notebook = useNotebookStore((s) => s.getNotebook(notebookId));
  const updateNotebook = useNotebookStore((s) => s.updateNotebook);
  const addNote = useNotebookStore((s) => s.addNote);
  const deleteNote = useNotebookStore((s) => s.deleteNote);
  const updateNoteColor = useNotebookStore((s) => s.updateNoteColor);
  const updateNoteTextColor = useNotebookStore((s) => s.updateNoteTextColor);
  const addHighlight = useNotebookStore((s) => s.addHighlight);
  const clearHighlights = useNotebookStore((s) => s.clearHighlights);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(notebook?.color || "#E63946");
  const [originalNotebookColor, setOriginalNotebookColor] = useState(notebook?.color || "#E63946");
  const [sliderPosition, setSliderPosition] = useState(0);
  const sliderWidth = 280;
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [showNoteColorPicker, setShowNoteColorPicker] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNoteColor, setSelectedNoteColor] = useState("#FFFFFF");
  const [originalNoteColor, setOriginalNoteColor] = useState("#FFFFFF");
  const [noteSliderPosition, setNoteSliderPosition] = useState(0);
  const [showNoteTextColorPicker, setShowNoteTextColorPicker] = useState(false);
  const [selectedNoteTextColor, setSelectedNoteTextColor] = useState("#000000");
  const [originalNoteTextColor, setOriginalNoteTextColor] = useState("#000000");
  const [noteTextSliderPosition, setNoteTextSliderPosition] = useState(0);
  const [showHighlighterPicker, setShowHighlighterPicker] = useState(false);
  const [highlighterColor, setHighlighterColor] = useState("#FFFF00");
  const [highlighterSliderPosition, setHighlighterSliderPosition] = useState(0.1667);
  const [highlightingNoteId, setHighlightingNoteId] = useState<string | null>(null);
  const [tempHighlights, setTempHighlights] = useState<Array<{ start: number; end: number; color: string }>>([]);
  const [currentSelection, setCurrentSelection] = useState<{ start: number; end: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [showTextInputModal, setShowTextInputModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

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

  // Helper function to get luminance of a color
  const getLuminance = (hexColor: string): number => {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  // Helper function to get contrasting color for icons based on background
  const getContrastingColor = (backgroundColor: string): string => {
    const luminance = getLuminance(backgroundColor);
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  };

  const getColorFromPosition = (position: number): string => {
    const hue = position * 360;
    return hslToHex(hue, 100, 50);
  };

  const getPositionFromColor = (hexColor: string): number => {
    // Convert hex to RGB
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Convert RGB to HSL to get hue
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

    return h; // Return normalized position (0-1)
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

  const notePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newPosition = Math.max(0, Math.min(1, x / sliderWidth));
        setNoteSliderPosition(newPosition);
        setSelectedNoteColor(getColorFromPosition(newPosition));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newPosition = Math.max(0, Math.min(1, x / sliderWidth));
        setNoteSliderPosition(newPosition);
        setSelectedNoteColor(getColorFromPosition(newPosition));
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  const noteTextPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newPosition = Math.max(0, Math.min(1, x / sliderWidth));
        setNoteTextSliderPosition(newPosition);
        setSelectedNoteTextColor(getColorFromPosition(newPosition));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newPosition = Math.max(0, Math.min(1, x / sliderWidth));
        setNoteTextSliderPosition(newPosition);
        setSelectedNoteTextColor(getColorFromPosition(newPosition));
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  const highlighterPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newPosition = Math.max(0, Math.min(1, x / sliderWidth));
        setHighlighterSliderPosition(newPosition);
        setHighlighterColor(getColorFromPosition(newPosition));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const newPosition = Math.max(0, Math.min(1, x / sliderWidth));
        setHighlighterSliderPosition(newPosition);
        setHighlighterColor(getColorFromPosition(newPosition));
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    })
  ).current;

  const handleSaveColor = () => {
    if (notebook) {
      updateNotebook(notebookId, { color: selectedColor });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowColorPicker(false);
  };

  const handleOpenNotebookColorPicker = () => {
    const currentColor = notebook?.color || "#E63946";
    setSelectedColor(currentColor);
    setOriginalNotebookColor(currentColor);
    const position = getPositionFromColor(currentColor);
    setSliderPosition(position);
    setShowColorPicker(true);
  };

  const handleResetNotebookColor = () => {
    setSelectedColor(originalNotebookColor);
    const position = getPositionFromColor(originalNotebookColor);
    setSliderPosition(position);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNoteColorPress = (noteId: string, currentColor?: string) => {
    const noteColor = currentColor || "#FFFFFF";
    setSelectedNoteId(noteId);
    setSelectedNoteColor(noteColor);
    setOriginalNoteColor(noteColor);
    const position = getPositionFromColor(noteColor);
    setNoteSliderPosition(position);
    setShowNoteColorPicker(true);
  };

  const handleResetNoteColor = () => {
    setSelectedNoteColor(originalNoteColor);
    // Reset the slider position to match the original color
    const position = getPositionFromColor(originalNoteColor);
    setNoteSliderPosition(position);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveNoteColor = () => {
    if (selectedNoteId) {
      updateNoteColor(notebookId, selectedNoteId, selectedNoteColor);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowNoteColorPicker(false);
    setSelectedNoteId(null);
  };

  const handleNoteTextColorPress = (noteId: string, currentTextColor?: string) => {
    const noteTextColor = currentTextColor || notebook?.textColor || "#000000";
    setSelectedNoteId(noteId);
    setSelectedNoteTextColor(noteTextColor);
    setOriginalNoteTextColor(noteTextColor);
    const position = getPositionFromColor(noteTextColor);
    setNoteTextSliderPosition(position);
    setShowNoteTextColorPicker(true);
  };

  const handleSaveNoteTextColor = () => {
    if (selectedNoteId) {
      updateNoteTextColor(notebookId, selectedNoteId, selectedNoteTextColor);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowNoteTextColorPicker(false);
    setSelectedNoteId(null);
  };

  const handleEditNote = (noteId: string, noteText: string) => {
    setEditingNoteId(noteId);
    setEditingNoteText(noteText);
  };

  const handleSaveNote = () => {
    if (editingNoteId && editingNoteText.trim() && notebook) {
      const updateNote = useNotebookStore.getState().updateNote;
      updateNote(notebookId, editingNoteId, editingNoteText.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handlePickImage = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== "granted") {
        Alert.alert("Permission Required", "Please grant photo library access to set a background image.");
        return;
      }

      // Open image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        updateNotebook(notebookId, { backgroundImage: imageUri });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      "Remove Background Image",
      "Are you sure you want to remove the background image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            updateNotebook(notebookId, { backgroundImage: undefined });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleOpenHighlighterPicker = (noteId: string) => {
    const note = notebook?.notes.find(n => n.id === noteId);
    setHighlightingNoteId(noteId);
    setTempHighlights(note?.highlights || []);
    setShowHighlighterPicker(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTextSelection = (noteId: string, start: number, end: number, text: string) => {
    console.log('=== TEXT SELECTION EVENT ===');
    console.log('Start:', start, 'End:', end, 'Length:', end - start);
    console.log('Selected text:', text.substring(start, end));

    if (start === end) {
      console.log('Selection cleared (start === end)');
      setCurrentSelection(null);
      setSelectedText("");
      return;
    }

    // Store the selection without adding highlight
    setCurrentSelection({ start, end });
    setSelectedText(text.substring(start, end));
    console.log('Selection stored, waiting for user to press Highlight button');
  };

  const handleApplyHighlight = () => {
    if (!currentSelection) {
      console.log('No selection to highlight');
      return;
    }

    console.log('Applying highlight to selection:', currentSelection);

    const newHighlight = {
      start: currentSelection.start,
      end: currentSelection.end,
      color: highlighterColor,
    };

    // Check if this exact range already has this color
    const exists = tempHighlights.some(
      h => h.start === newHighlight.start && h.end === newHighlight.end && h.color === newHighlight.color
    );

    if (!exists) {
      console.log('Adding new highlight:', newHighlight);
      setTempHighlights(prev => [...prev, newHighlight]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      console.log('Highlight already exists, skipping');
    }

    // Clear selection
    setCurrentSelection(null);
    setSelectedText("");
  };

  const handleSaveHighlights = () => {
    if (highlightingNoteId && notebook) {
      const note = notebook.notes.find(n => n.id === highlightingNoteId);
      if (note) {
        // Clear existing highlights and add all temp highlights
        clearHighlights(notebookId, highlightingNoteId);
        tempHighlights.forEach(highlight => {
          addHighlight(notebookId, highlightingNoteId, highlight);
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    setShowHighlighterPicker(false);
    setHighlightingNoteId(null);
    setTempHighlights([]);
  };

  const handleClearHighlights = (noteId: string) => {
    Alert.alert(
      "Clear Highlights",
      "Remove all highlights from this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearHighlights(notebookId, noteId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const renderHighlightedText = (text: string, highlights?: Array<{ start: number; end: number; color: string }>) => {
    console.log('=== RENDERING HIGHLIGHTED TEXT ===');
    console.log('Full text:', text);
    console.log('Text length:', text.length);
    console.log('Highlights:', highlights);

    if (!highlights || highlights.length === 0) {
      console.log('No highlights, returning plain text');
      return text;
    }

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);
    console.log('Sorted highlights:', sortedHighlights);

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, index) => {
      console.log(`Processing highlight ${index}:`, highlight);

      // Add text before highlight
      if (highlight.start > lastIndex) {
        const beforeText = text.substring(lastIndex, highlight.start);
        console.log(`Adding text before (${lastIndex} to ${highlight.start}):`, beforeText);
        elements.push(
          <Text key={`text-${index}`}>
            {beforeText}
          </Text>
        );
      }

      // Add highlighted text
      const highlightedText = text.substring(highlight.start, highlight.end);
      console.log(`Adding highlighted text (${highlight.start} to ${highlight.end}):`, highlightedText);
      elements.push(
        <Text
          key={`highlight-${index}`}
          style={{
            backgroundColor: highlight.color + "80", // Add transparency
          }}
        >
          {highlightedText}
        </Text>
      );

      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      console.log(`Adding remaining text (${lastIndex} to end):`, remainingText);
      elements.push(
        <Text key="text-end">
          {remainingText}
        </Text>
      );
    }

    console.log('Total elements created:', elements.length);
    return <>{elements}</>;
  };

  // Layout effect for header options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: notebook?.name || "Notebook",
      headerStyle: {
        backgroundColor: notebook?.color || "#ED0A3F",
      },
      headerTintColor: "#FFFFFF",
      headerTitleStyle: {
        fontWeight: "bold",
      },
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginRight: 16 }}>
          <Pressable
            onPress={handleOpenNotebookColorPicker}
          >
            <Ionicons name="color-palette-outline" size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={notebook?.backgroundImage ? handleRemoveImage : handlePickImage}
            onLongPress={notebook?.backgroundImage ? handlePickImage : undefined}
          >
            <Ionicons
              name={notebook?.backgroundImage ? "image" : "image-outline"}
              size={24}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, notebook]);

  if (!notebook) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, color: '#6B7280' }}>Notebook not found</Text>
      </SafeAreaView>
    );
  }

  const startRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const permission = await Audio.requestPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert("Permission Required", "Please grant microphone permission to record audio.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (!recording) return;

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (!uri) {
        Alert.alert("Error", "Failed to get recording URI.");
        return;
      }

      setIsTranscribing(true);
      try {
        const transcribedText = await transcribeAudio(uri);
        addNote(notebookId, transcribedText);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Transcription error:", error);
        Alert.alert("Error", "Failed to transcribe audio. Please try again.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsTranscribing(false);
      }

      setRecording(null);
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("Error", "Failed to stop recording.");
    }
  };

  const handleShare = async (noteText: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Use native share sheet to show all available sharing apps
      // This will display WhatsApp, Messenger, SMS, Email, and any other installed apps
      const result = await Share.share({ 
        message: noteText,
        title: 'Share Note' // Optional title for Android
      });

      if (result.action === Share.sharedAction) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.action === Share.dismissedAction) {
        // User dismissed the share dialog
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert("Share Error", "Failed to share the note. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteNote(notebookId, noteId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const backgroundColorWithOpacity = notebook.backgroundColor + "E6";

  return (
    <View style={{ flex: 1, backgroundColor: notebook.color }}>
      {/* Ghosted Background Image */}
      {notebook.backgroundImage && (
        <Image
          source={{ uri: notebook.backgroundImage }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.15,
          }}
          resizeMode="cover"
        />
      )}

      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {notebook.notes.length === 0 && !isTranscribing && (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Ionicons name="mic-outline" size={64} color={notebook.textColor} style={{ opacity: 0.3 }} />
              <Text style={{ fontSize: 18, textAlign: 'center', marginTop: 16, color: notebook.textColor, opacity: 0.5 }}>
                Tap the microphone to record your first note
              </Text>
            </View>
          )}

          {isTranscribing && (
            <View
              style={{ borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', backgroundColor: backgroundColorWithOpacity }}
            >
              <Ionicons name="hourglass-outline" size={32} color={notebook.textColor} />
              <Text style={{ fontSize: 16, marginTop: 8, color: notebook.textColor }}>
                Transcribing your note...
              </Text>
            </View>
          )}

          {notebook.notes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const noteBackgroundColor = note.backgroundColor || notebook.backgroundColor;
            const noteTextColor = note.textColor || notebook.textColor;
            // Use contrasting color for icons to ensure visibility on any background
            const iconColor = getContrastingColor(noteBackgroundColor);

            return (
              <View
                key={note.id}
                style={{ borderRadius: 16, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden', backgroundColor: noteBackgroundColor }}
              >
                {/* Lined paper effect */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  {[...Array(20)].map((_, i) => (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        borderBottomWidth: 1,
                        borderColor: iconColor,
                        opacity: 0.1,
                        top: 30 + i * 24,
                      }}
                    />
                  ))}
                </View>

                {isEditing ? (
                  <View>
                    <TextInput
                      value={editingNoteText}
                      onChangeText={setEditingNoteText}
                      multiline
                      autoFocus
                      style={{
                        fontSize: 16,
                        marginBottom: 16,
                        color: iconColor,
                        lineHeight: 24,
                        paddingTop: 6,
                        minHeight: 100,
                      }}
                      placeholderTextColor={iconColor + "80"}
                      placeholder="Type your note here..."
                    />
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                      <Pressable
                        onPress={handleCancelEdit}
                        style={{ flex: 1, backgroundColor: 'rgba(107, 114, 128, 0.5)', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleSaveNote}
                        disabled={!editingNoteText.trim()}
                        style={{ flex: 1, backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 8, alignItems: 'center', opacity: !editingNoteText.trim() ? 0.5 : 1 }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Save</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => handleEditNote(note.id, note.text)}>
                    <Text
                      style={{
                        fontSize: 16,
                        marginBottom: 16,
                        color: noteTextColor,
                        lineHeight: 24,
                        paddingTop: 6,
                      }}
                    >
                      {renderHighlightedText(note.text, note.highlights)}
                    </Text>
                  </Pressable>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12, borderColor: iconColor + "33" }}>
                  <Text style={{ fontSize: 12, color: iconColor, opacity: 0.6 }}>
                    {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString()}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable onPress={() => handleNoteColorPress(note.id, note.backgroundColor)}>
                      <Ionicons name="color-palette-outline" size={20} color={iconColor} />
                    </Pressable>
                    <Pressable onPress={() => handleNoteTextColorPress(note.id, note.textColor)}>
                      <Ionicons name="text-outline" size={20} color={iconColor} />
                    </Pressable>
                    {!isEditing && (
                      <>
                        <Pressable onPress={() => handleOpenHighlighterPicker(note.id)}>
                          <Ionicons name="color-fill-outline" size={20} color={iconColor} />
                        </Pressable>
                        {note.highlights && note.highlights.length > 0 && (
                          <Pressable onPress={() => handleClearHighlights(note.id)}>
                            <Ionicons name="remove-circle-outline" size={20} color={iconColor} />
                          </Pressable>
                        )}
                        <Pressable onPress={() => handleShare(note.text)}>
                          <Ionicons name="share-outline" size={20} color={iconColor} />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteNote(note.id)}>
                          <Ionicons name="trash-outline" size={20} color={iconColor} />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Buttons - Text and Record */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, paddingBottom: 32 }}>
          {/* Text Input Button */}
          <View style={{ alignItems: 'center' }}>
            <Pressable
              onPress={() => {
                setShowTextInputModal(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              disabled={isTranscribing || isRecording}
              style={{
                width: 70,
                height: 70,
                backgroundColor: "#FFFFFF",
                opacity: isTranscribing || isRecording ? 0.5 : 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 35,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text style={{ fontSize: 32, fontWeight: "bold", color: notebook.color }}>T</Text>
            </Pressable>
            <Text style={{ fontSize: 14, fontWeight: '500', marginTop: 12, color: '#FFFFFF' }}>
              Tap to Text
            </Text>
          </View>

          {/* Record Button */}
          <View style={{ alignItems: 'center' }}>
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              style={{
                width: 70,
                height: 70,
                backgroundColor: isRecording ? "#EF4444" : "#FFFFFF",
                opacity: isTranscribing ? 0.5 : 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 35,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={32}
                color={isRecording ? "#FFFFFF" : notebook.color}
              />
            </Pressable>
            <Text style={{ fontSize: 14, fontWeight: '500', marginTop: 12, color: '#FFFFFF' }}>
              {isRecording ? "Tap to Stop" : isTranscribing ? "Processing..." : "Tap to Record"}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Color Change</Text>
              <Pressable
                onPress={() => setShowColorPicker(false)}
              >
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 16 }}>
              Select Notebook Color
            </Text>

            {/* Default and Original Color Options */}
            <View style={{ marginBottom: 16, flexDirection: 'row', gap: 12 }}>
              {/* Default Color */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Default</Text>
                <Pressable
                  onPress={() => {
                    const defaultColor = "#E63946";
                    setSelectedColor(defaultColor);
                    const position = getPositionFromColor(defaultColor);
                    setSliderPosition(position);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{
                    height: 64,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    backgroundColor: "#E63946",
                    borderColor: selectedColor === "#E63946" ? "#3B82F6" : "#E5E7EB"
                  }}
                >
                  <Ionicons name="book-outline" size={32} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Original Color (only if different from default) */}
              {originalNotebookColor !== "#E63946" && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Current</Text>
                  <Pressable
                    onPress={() => {
                      setSelectedColor(originalNotebookColor);
                      const position = getPositionFromColor(originalNotebookColor);
                      setSliderPosition(position);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      height: 64,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      backgroundColor: originalNotebookColor,
                      borderColor: selectedColor === originalNotebookColor ? "#3B82F6" : "#E5E7EB"
                    }}
                  >
                    <Ionicons name="book-outline" size={32} color="#FFFFFF" />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Rainbow Gradient Slider */}
            <View style={{ marginBottom: 24, alignItems: 'center' }}>
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
                {/* Slider indicator */}
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

            {/* Color Preview */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Preview</Text>
              <View
                style={{
                  height: 96,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selectedColor
                }}
              >
                <Ionicons name="book-outline" size={48} color="#FFFFFF" />
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveColor}
              style={{ backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>Save Color</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Note Color Picker Modal */}
      <Modal
        visible={showNoteColorPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNoteColorPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Note Background Color</Text>
              <Pressable
                onPress={() => setShowNoteColorPicker(false)}
              >
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 16 }}>
              Select Note Background Color
            </Text>

            {/* Default and Original Color Options */}
            <View style={{ marginBottom: 16, flexDirection: 'row', gap: 12 }}>
              {/* Default Notebook Background */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Default</Text>
                <Pressable
                  onPress={() => {
                    setSelectedNoteColor(notebook?.backgroundColor || "#FFFFFF");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{
                    height: 64,
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 2,
                    backgroundColor: notebook?.backgroundColor || "#FFFFFF",
                    borderColor: selectedNoteColor === (notebook?.backgroundColor || "#FFFFFF") ? "#3B82F6" : "#E5E7EB"
                  }}
                >
                  <Text style={{ color: '#1F2937', fontSize: 12 }}>Notebook color</Text>
                </Pressable>
              </View>

              {/* Original Note Color (if different from default) */}
              {originalNoteColor !== (notebook?.backgroundColor || "#FFFFFF") && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Current</Text>
                  <Pressable
                    onPress={() => {
                      setSelectedNoteColor(originalNoteColor);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      height: 64,
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 2,
                      backgroundColor: originalNoteColor,
                      borderColor: selectedNoteColor === originalNoteColor ? "#3B82F6" : "#E5E7EB"
                    }}
                  >
                    <Text style={{ color: '#1F2937', fontSize: 12 }}>Current color</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Rainbow Gradient Slider */}
            <View style={{ marginBottom: 24, alignItems: 'center' }}>
              <View
                {...notePanResponder.panHandlers}
                style={{ width: sliderWidth, height: 60, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}
              >
                <LinearGradient
                  colors={["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
                {/* Slider indicator */}
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: noteSliderPosition * sliderWidth - 3,
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

            {/* Color Preview */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Preview</Text>
              <View
                style={{
                  height: 128,
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: selectedNoteColor
                }}
              >
                <Text style={{ color: '#1F2937', fontSize: 16 }}>Sample note text</Text>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 16 }}>
                  {[...Array(5)].map((_, i) => (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: 16,
                        right: 16,
                        borderBottomWidth: 1,
                        borderColor: "#000000",
                        opacity: 0.1,
                        top: 24 + i * 24,
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveNoteColor}
              style={{ backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>Save Color</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Note Text Color Picker Modal */}
      <Modal
        visible={showNoteTextColorPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNoteTextColorPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Note Text Color</Text>
              <Pressable
                onPress={() => setShowNoteTextColorPicker(false)}
              >
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 16 }}>
              Select Note Text Color
            </Text>

            {/* Default and Original Color Options */}
            <View style={{ marginBottom: 16, flexDirection: 'row', gap: 12 }}>
              {/* Default Notebook Text Color */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Default</Text>
                <Pressable
                  onPress={() => {
                    setSelectedNoteTextColor(notebook?.textColor || "#000000");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{
                    height: 64,
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 2,
                    backgroundColor: "#FFFFFF",
                    borderColor: selectedNoteTextColor === (notebook?.textColor || "#000000") ? "#3B82F6" : "#E5E7EB"
                  }}
                >
                  <Text style={{ color: notebook?.textColor || "#000000", fontSize: 12 }}>Notebook color</Text>
                </Pressable>
              </View>

              {/* Original Note Text Color (if different from default) */}
              {originalNoteTextColor !== (notebook?.textColor || "#000000") && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Current</Text>
                  <Pressable
                    onPress={() => {
                      setSelectedNoteTextColor(originalNoteTextColor);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      height: 64,
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 2,
                      backgroundColor: "#FFFFFF",
                      borderColor: selectedNoteTextColor === originalNoteTextColor ? "#3B82F6" : "#E5E7EB"
                    }}
                  >
                    <Text style={{ color: originalNoteTextColor, fontSize: 12 }}>Current color</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Rainbow Gradient Slider */}
            <View style={{ marginBottom: 24, alignItems: 'center' }}>
              <View
                {...noteTextPanResponder.panHandlers}
                style={{ width: sliderWidth, height: 60, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}
              >
                <LinearGradient
                  colors={["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
                {/* Slider indicator */}
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: noteTextSliderPosition * sliderWidth - 3,
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

            {/* Color Preview */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Preview</Text>
              <View
                style={{
                  height: 128,
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: "#FFFFFF"
                }}
              >
                <Text style={{ color: selectedNoteTextColor, fontSize: 16 }}>Sample note text</Text>
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 16 }}>
                  {[...Array(5)].map((_, i) => (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: 16,
                        right: 16,
                        borderBottomWidth: 1,
                        borderColor: selectedNoteTextColor,
                        opacity: 0.1,
                        top: 24 + i * 24,
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveNoteTextColor}
              style={{ backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>Save Color</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Highlighter Color Picker Modal */}
      <Modal
        visible={showHighlighterPicker}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowHighlighterPicker(false);
          setHighlightingNoteId(null);
          setTempHighlights([]);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: 80 }}>
              {/* Header */}
              <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Highlighter</Text>
                  <Pressable
                    onPress={() => {
                      setShowHighlighterPicker(false);
                      setHighlightingNoteId(null);
                      setTempHighlights([]);
                    }}
                  >
                    <Ionicons name="close" size={28} color="#374151" />
                  </Pressable>
                </View>

                <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 16 }}>
                  Select a color, then long press and drag to select text. Tap the Highlight button to apply.
                </Text>

                {/* Common Highlighter Colors */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[
                      { name: "Yellow", color: "#FFFF00" },
                      { name: "Green", color: "#00FF00" },
                      { name: "Pink", color: "#FF69B4" },
                      { name: "Orange", color: "#FFA500" },
                      { name: "Blue", color: "#00BFFF" },
                    ].map((item) => (
                      <Pressable
                        key={item.name}
                        onPress={() => {
                          setHighlighterColor(item.color);
                          const position = getPositionFromColor(item.color);
                          setHighlighterSliderPosition(position);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <View
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2,
                            backgroundColor: item.color + "80",
                            borderColor: highlighterColor === item.color ? "#3B82F6" : "#E5E7EB",
                          }}
                        >
                          <Text style={{ color: '#111827', fontSize: 12, fontWeight: '600' }}>{item.name}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* Rainbow Gradient Slider */}
                <View style={{ alignItems: 'center' }}>
                  <View
                    {...highlighterPanResponder.panHandlers}
                    style={{ width: sliderWidth, height: 40, borderRadius: 12, overflow: "hidden" }}
                  >
                    <LinearGradient
                      colors={["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ flex: 1 }}
                    />
                    {/* Slider indicator */}
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: highlighterSliderPosition * sliderWidth - 3,
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
              </View>

              {/* Scrollable Note Text */}
              <ScrollView style={{ flex: 1, padding: 24 }} keyboardShouldPersistTaps="handled">
                {highlightingNoteId && notebook?.notes.find(n => n.id === highlightingNoteId) && (
                  <View>
                    {/* Show current selection info and Highlight button */}
                    {currentSelection && selectedText && (
                      <View style={{ marginBottom: 16, padding: 16, backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E3A8A', marginBottom: 8 }}>
                          Selected: &ldquo;{selectedText.length > 50 ? selectedText.substring(0, 50) + "..." : selectedText}&rdquo;
                        </Text>
                        <Pressable
                          onPress={handleApplyHighlight}
                          style={{ backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Highlight</Text>
                        </Pressable>
                      </View>
                    )}

                    {/* Single view with overlay approach */}
                    <View style={{ borderRadius: 16, padding: 24, backgroundColor: notebook.backgroundColor }}>
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
                        {[...Array(50)].map((_, i) => (
                          <View
                            key={i}
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              borderBottomWidth: 1,
                              borderColor: notebook.textColor,
                              opacity: 0.1,
                              top: 30 + i * 24,
                            }}
                          />
                        ))}
                      </View>

                      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: notebook.textColor, opacity: 0.7 }}>
                        Long press and drag to select text:
                      </Text>

                      <View style={{ position: 'relative' }}>
                        {/* Display layer - shows highlights */}
                        {tempHighlights.length > 0 && (
                          <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="none">
                            <Text
                              style={{
                                color: notebook.textColor,
                                fontSize: 16,
                                lineHeight: 24,
                                fontFamily: 'System',
                                minHeight: 200,
                              }}
                            >
                              {renderHighlightedText(
                                notebook.notes.find(n => n.id === highlightingNoteId)?.text || "",
                                tempHighlights
                              )}
                            </Text>
                          </View>
                        )}

                        {/* Interaction layer - handles selection */}
                        <TextInput
                          key={`text-input-${tempHighlights.length}`}
                          value={notebook.notes.find(n => n.id === highlightingNoteId)?.text || ""}
                          multiline
                          editable={false}
                          selectTextOnFocus
                          style={{
                            color: tempHighlights.length > 0 ? 'transparent' : notebook.textColor,
                            fontSize: 16,
                            lineHeight: 24,
                            fontFamily: 'System',
                            minHeight: 200,
                          }}
                          onSelectionChange={(event) => {
                            const { start, end } = event.nativeEvent.selection;
                            const noteText = notebook.notes.find(n => n.id === highlightingNoteId)?.text || "";
                            if (start !== end && highlightingNoteId) {
                              handleTextSelection(highlightingNoteId, start, end, noteText);
                            }
                          }}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Save Button */}
              <View style={{ padding: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                <Pressable
                  onPress={handleSaveHighlights}
                  style={{ backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>Save</Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Text Input Modal */}
      <Modal
        visible={showTextInputModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowTextInputModal(false);
          setNewNoteText("");
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>New Note</Text>
              <Pressable
                onPress={() => {
                  setShowTextInputModal(false);
                  setNewNoteText("");
                }}
              >
                <Ionicons name="close" size={28} color="#374151" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 16 }}>
              Type your note below
            </Text>

            <TextInput
              value={newNoteText}
              onChangeText={setNewNoteText}
              multiline
              autoFocus
              placeholder="Start typing your note..."
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                fontSize: 16,
                color: '#111827',
                marginBottom: 24,
                minHeight: 150,
                textAlignVertical: "top",
              }}
            />

            <Pressable
              onPress={() => {
                if (newNoteText.trim()) {
                  addNote(notebookId, newNoteText.trim());
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setNewNoteText("");
                  setShowTextInputModal(false);
                }
              }}
              disabled={!newNoteText.trim()}
              style={{
                backgroundColor: '#2563EB',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: !newNoteText.trim() ? 0.5 : 1
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>Save Note</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};
