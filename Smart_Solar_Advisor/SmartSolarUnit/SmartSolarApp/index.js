/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Suppress InteractionManager deprecation warning from React Navigation
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);

AppRegistry.registerComponent(appName, () => App);
