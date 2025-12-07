import { describe, it, expect } from 'vitest';

describe('Public API Imports', () => {
  it('should export all public APIs from index.js', async () => {
    const module = await import('../index.js');

    // Version
    expect(module.Version).toBeDefined();

    // Utils
    expect(module.Log).toBeDefined();
    expect(module.Global).toBeDefined();

    // Models
    expect(module.User).toBeDefined();

    // Storage
    expect(module.WebStorageStateStore).toBeDefined();
    expect(module.InMemoryWebStorage).toBeDefined();

    // Services
    expect(module.MetadataService).toBeDefined();

    // Navigation
    expect(module.CheckSessionIFrame).toBeDefined();
    expect(module.CordovaPopupNavigator).toBeDefined();
    expect(module.CordovaIFrameNavigator).toBeDefined();

    // Protocol
    expect(module.TokenRevocationClient).toBeDefined();

    // Auth
    expect(module.OidcClient).toBeDefined();
    expect(module.UserManager).toBeDefined();
    expect(module.OidcClientSettings).toBeDefined();
    expect(module.UserManagerSettings).toBeDefined();
    expect(module.AccessTokenEvents).toBeDefined();
    expect(module.SessionMonitor).toBeDefined();
  });
});

describe('Consolidated Module Imports', () => {
  it('should import from auth/Client.js', async () => {
    const { OidcClient, UserManager } = await import('../src/auth/Client.js');
    expect(OidcClient).toBeDefined();
    expect(UserManager).toBeDefined();
  });

  it('should import from auth/Settings.js', async () => {
    const { OidcClientSettings, UserManagerSettings } = await import('../src/auth/Settings.js');
    expect(OidcClientSettings).toBeDefined();
    expect(UserManagerSettings).toBeDefined();
  });

  it('should import from auth/Events.js', async () => {
    const { AccessTokenEvents, UserManagerEvents } = await import('../src/auth/Events.js');
    expect(AccessTokenEvents).toBeDefined();
    expect(UserManagerEvents).toBeDefined();
  });

  it('should import from utils/Event.js', async () => {
    const { Event } = await import('../src/utils/Event.js');
    expect(Event).toBeDefined();
  });

  it('should import from auth/Session.js', async () => {
    const { State, SigninState, SessionMonitor, SilentRenewService } = await import('../src/auth/Session.js');
    expect(State).toBeDefined();
    expect(SigninState).toBeDefined();
    expect(SessionMonitor).toBeDefined();
    expect(SilentRenewService).toBeDefined();
  });

  it('should import from protocol/Requests.js', async () => {
    const { SigninRequest, SignoutRequest } = await import('../src/protocol/Requests.js');
    expect(SigninRequest).toBeDefined();
    expect(SignoutRequest).toBeDefined();
  });

  it('should import from protocol/Responses.js', async () => {
    const { SigninResponse, SignoutResponse, ErrorResponse } = await import('../src/protocol/Responses.js');
    expect(SigninResponse).toBeDefined();
    expect(SignoutResponse).toBeDefined();
    expect(ErrorResponse).toBeDefined();
  });

  it('should import from protocol/TokenService.js', async () => {
    const { TokenClient, TokenRevocationClient, UserInfoService } = await import('../src/protocol/TokenService.js');
    expect(TokenClient).toBeDefined();
    expect(TokenRevocationClient).toBeDefined();
    expect(UserInfoService).toBeDefined();
  });

  it('should import from navigation/Navigator.js', async () => {
    const {
      RedirectNavigator,
      PopupWindow,
      PopupNavigator,
      IFrameWindow,
      IFrameNavigator,
      CheckSessionIFrame,
      CordovaPopupWindow,
      CordovaPopupNavigator,
      CordovaIFrameNavigator,
    } = await import('../src/navigation/Navigator.js');

    expect(RedirectNavigator).toBeDefined();
    expect(PopupWindow).toBeDefined();
    expect(PopupNavigator).toBeDefined();
    expect(IFrameWindow).toBeDefined();
    expect(IFrameNavigator).toBeDefined();
    expect(CheckSessionIFrame).toBeDefined();
    expect(CordovaPopupWindow).toBeDefined();
    expect(CordovaPopupNavigator).toBeDefined();
    expect(CordovaIFrameNavigator).toBeDefined();
  });

  it('should import from storage/Storage.js', async () => {
    const { WebStorageStateStore, InMemoryWebStorage } = await import('../src/storage/Storage.js');
    expect(WebStorageStateStore).toBeDefined();
    expect(InMemoryWebStorage).toBeDefined();
  });

  it('should import from crypto/Crypto.js', async () => {
    const { generateRandom, JoseUtil } = await import('../src/crypto/Crypto.js');
    expect(generateRandom).toBeDefined();
    expect(JoseUtil).toBeDefined();
  });

  it('should import from services/Http.js', async () => {
    const { UrlUtility, JsonService, MetadataService } = await import('../src/services/Http.js');
    expect(UrlUtility).toBeDefined();
    expect(JsonService).toBeDefined();
    expect(MetadataService).toBeDefined();
  });

  it('should import from services/Timer.js', async () => {
    const { Timer, ClockService } = await import('../src/services/Timer.js');
    expect(Timer).toBeDefined();
    expect(ClockService).toBeDefined();
  });

  it('should import from models/User.js', async () => {
    const { User } = await import('../src/models/User.js');
    expect(User).toBeDefined();
  });

  it('should import from utils/Log.js', async () => {
    const { Log } = await import('../src/utils/Log.js');
    expect(Log).toBeDefined();
  });

  it('should import from utils/Global.js', async () => {
    const { Global } = await import('../src/utils/Global.js');
    expect(Global).toBeDefined();
  });
});

describe('Import Path Consistency', () => {
  it('should export same instances from index.js and direct imports', async () => {
    const indexModule = await import('../index.js');
    const { OidcClient } = await import('../src/auth/Client.js');
    const { User } = await import('../src/models/User.js');
    const { Log } = await import('../src/utils/Log.js');

    expect(indexModule.OidcClient).toBe(OidcClient);
    expect(indexModule.User).toBe(User);
    expect(indexModule.Log).toBe(Log);
  });
});
