/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  AsyncStorage,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { Button, colors, ListItem, Text, Icon, Overlay } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import Url from 'url';
import { useNavigation } from '@react-navigation/native';
import PropTypes from 'prop-types';

import ServerInput from '../components/ServerInput';
import SettingsSection from '../components/SettingsSection';
import Colors from '../constants/Colors';
import Links from '../constants/Links';
import StorageKeys from '../constants/Storage';
import CachingStorage from '../utils/CachingStorage';
import JellyfinValidator from '../utils/JellyfinValidator';
import { getAppName } from '../utils/Device';
import { openBrowser } from '../utils/WebBrowser';

class SettingsScreen extends React.Component {
  static propTypes = {
    navigation: PropTypes.object.isRequired
  }

  state = {
    isAddServerVisible: false,
    servers: null
  };

  _keyExtractor = (item, index) => `${item.name}-${index}`;

  _renderLink = ({ item, index }) => {
    console.log('renderLink', item);
    return (
      <ListItem
        title={item.name}
        leftIcon={item.icon}
        topDivider={index === 0}
        bottomDivider
        chevron
        onPress={() => {
          openBrowser(item.url);
        }}
      />
    );
  };

  _renderServer = ({ item, index }) => {
    const { info, serverUrl, online = false } = item;
    console.log('renderServer', info, serverUrl, online);

    let title;
    let subtitle;
    if (info) {
      title = info.ServerName;
      subtitle = `Version: ${info.Version}\n${serverUrl}`;
    } else {
      title = Url.parse(serverUrl).host;
      subtitle = `Version: unknown\n${serverUrl}`;
    }

    return (<ListItem
      title={title}
      titleStyle={{
        marginBottom: 2
      }}
      subtitle={subtitle}
      leftElement={(
        index === this.state.activeServer ? (
          <Icon
            name={(Platform.OS === 'ios' ? 'ios-checkmark' : 'md-checkmark')}
            type='ionicon'
            size={24}
            containerStyle={{ width: 12 }}
          />
        ) : (
          <View style={{ width: 12 }} />
        )
      )}
      rightElement={(
        <Button
          type='clear'
          icon={{
            name: Platform.OS === 'ios' ? 'ios-trash' : 'md-trash',
            type: 'ionicon',
            iconStyle: {
              color: Platform.OS === 'ios' ? colors.platform.ios.error : colors.platform.android.error
            }
          }}
          onPress={() => this.onDeleteServer(index)}
        />
      )}
      topDivider={index === 0}
      bottomDivider
      onPress={async () => {
        this.setState({
          activeServer: index
        });
        await CachingStorage.getInstance().setItem(StorageKeys.ActiveServer, index);
        this.props.navigation.navigate('Home', { activeServer: index });
      }}
    />);
  };

  async bootstrapAsync() {
    const activeServer = await CachingStorage.getInstance().getItem(StorageKeys.ActiveServer) || 0;
    let servers = await CachingStorage.getInstance().getItem(StorageKeys.Servers);

    servers = servers.map(async (server) => {
      let serverUrl;
      try {
        serverUrl = JellyfinValidator.getServerUrl(server);
      } catch (err) {
        serverUrl = '';
      }
      // Try to fetch the server's public info
      try {
        const serverInfo = await JellyfinValidator.fetchServerInfo(server);
        return Object.assign(
          {},
          server,
          {
            info: serverInfo,
            serverUrl,
            online: true
          }
        );
      } catch (err) {
        return Object.assign(
          {},
          server,
          {
            serverUrl,
            online: false
          }
        );
      }
    });

    servers = await Promise.all(servers);

    console.log('bootstrapAsync', servers);

    this.setState({
      activeServer,
      servers
    });
  }

  async deleteServer(index) {
    // Get the current list of servers
    const servers = this.state.servers;
    // Remove one server at index
    servers.splice(index, 1);
    // Save to storage cache
    await CachingStorage.getInstance().setItem(StorageKeys.ActiveServer, 0);
    await CachingStorage.getInstance().setItem(StorageKeys.Servers, servers);

    if (servers.length > 0) {
      // More servers exist, update state and navigate home
      this.bootstrapAsync();
      this.props.navigation.navigate('Home', { activeServer: 0 });
    } else {
      // No servers are present, navigate to add server screen
      this.props.navigation.replace('AddServer');
    }
  }

  async resetApplication() {
    // Remove all storage items used in the app
    await AsyncStorage.multiRemove(Object.values(StorageKeys));
    // Reset the storage cache
    CachingStorage.instance = null;
    // Navigate to the loading screen
    this.props.navigation.replace('AddServer');
  }

  onDeleteServer(index) {
    Alert.alert(
      'Delete Server',
      'Are you sure you want to delete this server?',
      [
        { text: 'Cancel' },
        { text: 'Delete', onPress: () => this.deleteServer(index), style: 'destructive' }
      ]
    );
  }

  onResetApplication() {
    Alert.alert(
      'Reset Application',
      'Are you sure you want to reset all settings?',
      [
        { text: 'Cancel' },
        { text: 'Reset', onPress: () => this.resetApplication(), style: 'destructive' }
      ]
    );
  }

  componentDidMount() {
    this.bootstrapAsync();
  }

  render() {
    return (
      <SafeAreaView style={{...styles.container, paddingTop: 0}} >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <SettingsSection heading='Servers'>
            {
              this.state.servers ? (
                <FlatList
                  keyExtractor={this._keyExtractor}
                  data={this.state.servers}
                  renderItem={this._renderServer}
                  scrollEnabled={false}
                  extraData={this.state.activeServer}
                />
              ) : (
                <ActivityIndicator />
              )
            }
          </SettingsSection>

          <Button
            buttonStyle={{ margin: 15 }}
            title='Add Server'
            onPress={() => this.setState({ isAddServerVisible: true })}
          />

          <SettingsSection heading='Links'>
            <FlatList
              keyExtractor={this._keyExtractor}
              data={Links}
              renderItem={this._renderLink}
              scrollEnabled={false}
            />
          </SettingsSection>

          <Button
            buttonStyle={{
              backgroundColor: Platform.OS === 'ios' ? colors.platform.ios.error : colors.platform.android.error,
              margin: 15
            }}
            title='Reset Application'
            onPress={() => this.onResetApplication()}
          />

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>{`${getAppName()}`}</Text>
            <Text style={styles.infoText}>{`${Constants.nativeAppVersion} (${Constants.nativeBuildVersion})`}</Text>
            <Text style={styles.infoText}>{`Expo Version: ${Constants.expoVersion}`}</Text>
          </View>
        </ScrollView>

        <Overlay
          height={'auto'}
          isVisible={this.state.isAddServerVisible}
          onBackdropPress={() => this.setState({ isAddServerVisible: false })}
        >
          <ServerInput
            onSuccess={() => {
              this.setState({ isAddServerVisible: false });
              this.bootstrapAsync();
            }}
            successScreen={'Home'}
          />
        </Overlay>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundColor
  },
  infoContainer: {
    margin: 15
  },
  infoText: {
    color: colors.grey4,
    fontSize: 15
  }
});

// Inject the Navigation Hook as a prop to mimic the legacy behavior
const SettingsScreenWithNavigation = function(props) {
  const navigation = useNavigation();
  return <SettingsScreen {...props} navigation={navigation} />;
};

export default SettingsScreenWithNavigation;
