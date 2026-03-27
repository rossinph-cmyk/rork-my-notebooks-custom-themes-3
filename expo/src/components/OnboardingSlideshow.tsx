import React, { useState, useRef } from "react";
import { View, Text, Modal, Pressable, ScrollView, Dimensions, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlideshowProps {
  visible: boolean;
  onComplete: () => void;
}

const SLIDES = [
  {
    id: 1,
    color: "#7C3AED",
    title: "Welcome to Voice Notepad!",
    features: [
      {
        icon: "mic",
        title: "Voice-to-Text",
        description: "Tap the microphone button to record your voice and instantly convert it to text"
      },
      {
        icon: "create-outline",
        title: "Edit Text Anytime",
        description: "Click on any note text to manually edit it with your keyboard"
      },
      {
        icon: "color-palette",
        title: "Customize Colors",
        description: "Change notebook cover colors using the rainbow gradient color picker"
      },
      {
        icon: "image-outline",
        title: "Add Background Images",
        description: "Personalize each notebook with custom photos and adjust transparency"
      }
    ]
  },
  {
    id: 2,
    color: "#EC4899",
    title: "Organize Your Notes",
    features: [
      {
        icon: "book",
        title: "Multiple Notebooks",
        description: "Create unlimited notebooks to organize different topics or projects"
      },
      {
        icon: "color-fill",
        title: "Individual Note Colors",
        description: "Customize background and text colors for each individual note"
      },
      {
        icon: "layers-outline",
        title: "Transparency Control",
        description: "Adjust image transparency with a slider for perfect visibility (0-100%)"
      },
      {
        icon: "share-social",
        title: "Share Your Notes",
        description: "Easily share notes via WhatsApp, messaging apps, or email"
      }
    ]
  },
  {
    id: 3,
    color: "#D4A574",
    title: "Personalize Everything",
    features: [
      {
        icon: "image",
        title: "Notebook Background Images",
        description: "Add custom photos to individual notebook covers with ghosted transparency"
      },
      {
        icon: "images-outline",
        title: "Home Screen Background",
        description: "Set a background image for your entire home screen"
      },
      {
        icon: "contrast",
        title: "Dark Mode",
        description: "Toggle between light and dark themes for comfortable viewing"
      },
      {
        icon: "pencil",
        title: "Rename Notebooks",
        description: "Tap on notebook names to quickly rename and organize your collection"
      }
    ]
  },
  {
    id: 4,
    color: "#0891B2",
    title: "Advanced Features",
    features: [
      {
        icon: "trash-outline",
        title: "Delete Notes & Notebooks",
        description: "Long-press notebooks or swipe notes to delete unwanted items"
      },
      {
        icon: "eye-outline",
        title: "Lined Paper View",
        description: "Notes display on realistic lined paper for a familiar writing experience"
      },
      {
        icon: "save-outline",
        title: "Auto-Save",
        description: "All your notes are automatically saved locally on your device"
      },
      {
        icon: "finger-print",
        title: "No Account Required",
        description: "Privacy-focused: no login needed, all data stays on your device"
      }
    ]
  }
];

export const OnboardingSlideshow: React.FC<OnboardingSlideshowProps> = ({
  visible,
  onComplete,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slideIndex !== currentSlide) {
      setCurrentSlide(slideIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * SCREEN_WIDTH,
        animated: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
    setCurrentSlide(0);
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleComplete}
    >
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              style={[styles.slideContainer, { width: SCREEN_WIDTH }]}
            >
              <View style={styles.slideContent}>
                <LinearGradient
                  colors={[slide.color + "CC", slide.color + "66", "#000000"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.gradient}
                >
                  <View style={styles.titleSection}>
                    <View style={styles.titleCard}>
                      <Text style={styles.title}>
                        {slide.title}
                      </Text>
                    </View>
                  </View>

                <ScrollView
                  style={styles.featuresScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {slide.features.map((feature, idx) => (
                    <View
                      key={idx}
                      style={styles.featureCard}
                    >
                      <View style={styles.iconContainer}>
                        <View style={styles.iconCircle}>
                          <Ionicons name={feature.icon as any} size={24} color="#FFFFFF" />
                        </View>
                      </View>
                      <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>
                          {feature.title}
                        </Text>
                        <Text style={styles.featureDescription}>
                          {feature.description}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <View style={styles.bottomSpacer} />
                </ScrollView>
              </LinearGradient>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.bottomNav}>
          <View style={styles.dotsContainer}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: currentSlide === index ? 32 : 8,
                    backgroundColor: currentSlide === index ? "#FFFFFF" : "#FFFFFF40",
                  }
                ]}
              />
            ))}
          </View>

          <View style={styles.buttonsContainer}>
            {currentSlide < SLIDES.length - 1 ? (
              <>
                <Pressable
                  onPress={handleSkip}
                  style={styles.skipButton}
                >
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
                <Pressable
                  onPress={handleNext}
                  style={styles.nextButton}
                >
                  <Text style={styles.nextText}>Next</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={handleComplete}
                style={styles.getStartedButton}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  slideContainer: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  titleSection: {
    height: 256,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  titleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  featuresScroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
  },
  iconContainer: {
    marginRight: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 128,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: 'bold',
  },
  getStartedButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
