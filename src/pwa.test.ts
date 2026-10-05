import { describe, expect, it, vi } from 'vitest'
import { registerOfflineSupport } from './pwa'

describe('registerOfflineSupport', () => {
  it('registers the scoped service worker in production', async () => {
    const register = vi.fn().mockResolvedValue({ scope: 'http://example.test/app/' })

    await registerOfflineSupport({
      isProduction: true,
      baseUrl: '/app/',
      serviceWorker: { register },
    })

    expect(register).toHaveBeenCalledWith('/app/sw.js', { scope: '/app/' })
  })

  it('does nothing outside production or without service-worker support', async () => {
    const register = vi.fn()

    await registerOfflineSupport({
      isProduction: false,
      baseUrl: '/',
      serviceWorker: { register },
    })
    await registerOfflineSupport({
      isProduction: true,
      baseUrl: '/',
      serviceWorker: undefined,
    })

    expect(register).not.toHaveBeenCalled()
  })
})
