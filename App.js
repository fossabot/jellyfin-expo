/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import React, { useEffect, useState } from 'react';
import { Platform, StatusBar } from 'react-native';
import { ThemeProvider } from 'react-native-elements';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppLoading } from 'expo';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import { Audio } from 'expo-av';

import AppNavigator from './navigation/AppNavigator';
import Theme from './utils/Theme';

function App({ skipLoadingScreen }) {
  const [isSplashReady, setIsSplashReady] = useState(false);

  useEffect(() => {
    // Lock portrait orientation on iPhone
    if (Platform.OS === 'ios' && !Platform.isPad) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }

    // Setup audio preferences
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
    });
  }, []);

  const loadImagesAsync = () => {
    const images = [
      require('./assets/images/splash.png'),
      require('./assets/images/logowhite.png')
    ];
    return images.map(image => Asset.fromModule(image).downloadAsync());
  };

  const loadResourcesAsync = async () => {
    return Promise.all([
      Font.loadAsync({
        // This is the font that we are using for our tab bar
        ...Ionicons.font
      }),
      ...loadImagesAsync()
    ]);
  };

  if (!isSplashReady && !skipLoadingScreen) {
    return (
      <AppLoading
        startAsync={loadResourcesAsync}
        onError={console.warn}
        onFinish={() => setIsSplashReady(true)}
        autoHideSplash={false}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={Theme}>
        {Platform.OS === 'ios' && <StatusBar barStyle="light-content" />}
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

App.propTypes = {
  skipLoadingScreen: PropTypes.bool
};

export default App;
