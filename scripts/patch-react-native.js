#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying React Native 0.81.5 patches...\n');

// Patch 1: ReactNativeFeatureFlagsCxxInterop.kt
const interopPath = path.join(
  __dirname,
  '../node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/internal/featureflags/ReactNativeFeatureFlagsCxxInterop.kt'
);

console.log('📝 Patching ReactNativeFeatureFlagsCxxInterop.kt...');

if (!fs.existsSync(interopPath)) {
  console.error('❌ ERROR: ReactNativeFeatureFlagsCxxInterop.kt not found!');
  process.exit(1);
}

let interopContent = fs.readFileSync(interopPath, 'utf8');

if (interopContent.includes('// PATCHED:')) {
  console.log('✅ Already patched\n');
} else {
  interopContent = interopContent.replace(
    /(\s+)SoLoader\.loadLibrary\("react_featureflagsjni"\)/g,
    '$1// PATCHED: SoLoader.loadLibrary("react_featureflagsjni")'
  );

  const methodsToStub = [
    'commonTestFlag', 'allowRecursiveCommitsWithSynchronousMountOnAndroid',
    'batchRenderingUpdatesInEventLoop', 'completeReactInstanceCreationOnBgThreadOnAndroid',
    'destroyFabricSurfacesInReactInstanceManager', 'enableAlignItemsBaselineOnFabricIOS',
    'enableBackgroundStyleApplicator', 'enableCleanTextInputYogaNode',
    'enableGranularShadowTreeStateReconciliation', 'enableLayoutAnimationsOnIOS',
    'enableLongTaskAPI', 'enableMicrotasks', 'enablePropsUpdateReconciliationAndroid',
    'enableReportEventPaintTime', 'enableSynchronousStateUpdates', 'enableUIConsistency',
    'enableViewRecycling', 'excludeYogaFromRawProps', 'fetchImagesInViewPreallocation',
    'fixIncorrectScrollViewStateUpdateOnAndroid', 'fixMappingOfEventPrioritiesBetweenFabricAndReact',
    'fixMissedFabricStateUpdatesOnAndroid', 'forceBatchingMountItemsOnAndroid',
    'fuseboxEnabledDebug', 'fuseboxEnabledRelease', 'initEagerTurboModulesOnNativeModulesQueueAndroid',
    'lazyAnimationCallbacks', 'loadVectorDrawablesOnImages', 'setAndroidLayoutDirection',
    'traceTurboModulePromiseRejectionsOnAndroid', 'useFabricInterop',
    'useImmediateExecutorInAndroidBridgeless', 'useModernRuntimeScheduler',
    'useNativeViewConfigsInBridgelessMode', 'useNewReactImageViewBackgroundDrawing',
    'useOptimisedViewPreallocationOnAndroid', 'useRuntimeShadowNodeReferenceUpdate',
    'useRuntimeShadowNodeReferenceUpdateOnLayout', 'useTurboModuleInterop',
    'useTurboModules', 'enableBridgelessArchitecture'
  ];

  methodsToStub.forEach((methodName) => {
    const externalPattern = new RegExp(
      `(\\s+)@DoNotStrip\\s+external fun ${methodName}\\(\\): Boolean`,
      'g'
    );
    interopContent = interopContent.replace(
      externalPattern,
      `$1@DoNotStrip\n$1fun ${methodName}(): Boolean = false // PATCHED`
    );
  });

  fs.writeFileSync(interopPath, interopContent, 'utf8');
  console.log('✅ Patched successfully\n');
}

// Patch 2: Expo ReactNativeFeatureFlags.kt
const expoFlagsPath = path.join(
  __dirname,
  '../node_modules/expo-modules-core/android/src/main/java/expo/modules/rncompatibility/ReactNativeFeatureFlags.kt'
);

console.log('📝 Patching Expo ReactNativeFeatureFlags.kt...');

if (!fs.existsSync(expoFlagsPath)) {
  console.log('⚠️  File not found (not critical)\n');
} else {
  let expoFlagsContent = fs.readFileSync(expoFlagsPath, 'utf8');

  if (expoFlagsContent.includes('// PATCHED:')) {
    console.log('✅ Already patched\n');
  } else {
    // Comment out the import
    expoFlagsContent = expoFlagsContent.replace(
      /import com\.facebook\.react\.internal\.featureflags\.ReactNativeFeatureFlags/g,
      '// PATCHED: import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags'
    );

    // Replace the val line to return false directly
    expoFlagsContent = expoFlagsContent.replace(
      /val enableBridgelessArchitecture = ReactNativeFeatureFlags\.enableBridgelessArchitecture\(\)/g,
      '// PATCHED: Return false instead of calling the feature flag\n  val enableBridgelessArchitecture = false'
    );

    fs.writeFileSync(expoFlagsPath, expoFlagsContent, 'utf8');
    console.log('✅ Patched successfully\n');
  }
}

console.log('✅ All patches applied!\n');
