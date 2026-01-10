import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Modal, TextInput, ScrollView, StyleSheet } from "react-native";
import { useNotebookStore } from "../state/notebookStore";
import { CRAYON_COLORS, BACKGROUND_COLORS } from "../types/notebook";
import { Ionicons } from "@expo/vector-icons";

interface NotebookModalProps {
  visible: boolean;
  onClose: () => void;
  notebookId?: string | null;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({
  visible,
  onClose,
  notebookId,
}) => {
  const addNotebook = useNotebookStore((s) => s.addNotebook);
  const updateNotebook = useNotebookStore((s) => s.updateNotebook);
  const getNotebook = useNotebookStore((s) => s.getNotebook);
  const deleteNotebook = useNotebookStore((s) => s.deleteNotebook);

  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(CRAYON_COLORS[0].hex);
  const [selectedTextColor, setSelectedTextColor] = useState(CRAYON_COLORS[11].hex);
  const [selectedBgColor, setSelectedBgColor] = useState(BACKGROUND_COLORS[0].hex);

  useEffect(() => {
    if (notebookId) {
      const notebook = getNotebook(notebookId);
      if (notebook) {
        setName(notebook.name);
        setSelectedColor(notebook.color);
        setSelectedTextColor(notebook.textColor);
        setSelectedBgColor(notebook.backgroundColor);
      }
    } else {
      setName("");
      setSelectedColor(CRAYON_COLORS[0].hex);
      setSelectedTextColor(CRAYON_COLORS[11].hex);
      setSelectedBgColor(BACKGROUND_COLORS[0].hex);
    }
  }, [notebookId, visible, getNotebook]);

  const handleSave = () => {
    if (!name.trim()) return;

    if (notebookId) {
      updateNotebook(notebookId, {
        name: name.trim(),
        color: selectedColor,
        textColor: selectedTextColor,
        backgroundColor: selectedBgColor,
      });
    } else {
      addNotebook({
        name: name.trim(),
        color: selectedColor,
        textColor: selectedTextColor,
        backgroundColor: selectedBgColor,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (notebookId) {
      deleteNotebook(notebookId);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {notebookId ? "Edit Notebook" : "New Notebook"}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Notebook Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter notebook name"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Cover Color</Text>
          <View style={styles.colorGrid}>
            {CRAYON_COLORS.map((color, index) => (
              <Pressable
                key={`cover-${index}-${color.hex}`}
                onPress={() => setSelectedColor(color.hex)}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: color.hex,
                    borderWidth: selectedColor === color.hex ? 4 : 0,
                    borderColor: "#374151",
                  }
                ]}
              />
            ))}
          </View>

          <Text style={styles.label}>Text Color</Text>
          <View style={styles.colorGrid}>
            {CRAYON_COLORS.map((color, index) => (
              <Pressable
                key={`text-${index}-${color.hex}`}
                onPress={() => setSelectedTextColor(color.hex)}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: color.hex,
                    borderWidth: selectedTextColor === color.hex ? 4 : 0,
                    borderColor: "#374151",
                  }
                ]}
              />
            ))}
          </View>

          <Text style={styles.label}>Background Color</Text>
          <View style={styles.colorGrid}>
            {[...BACKGROUND_COLORS, ...CRAYON_COLORS].map((color, index) => (
              <Pressable
                key={`bg-${index}-${color.hex}`}
                onPress={() => setSelectedBgColor(color.hex)}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: color.hex,
                    borderWidth: selectedBgColor === color.hex ? 4 : 0,
                    borderColor: "#374151",
                  }
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleSave}
            disabled={!name.trim()}
            style={[styles.saveButton, { opacity: !name.trim() ? 0.5 : 1 }]}
          >
            <Text style={styles.saveButtonText}>
              {notebookId ? "Save Changes" : "Create Notebook"}
            </Text>
          </Pressable>

          {notebookId && (
            <Pressable
              onPress={handleDelete}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>Delete Notebook</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 32,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
