interface ServiceWorkerRegistrar {
  register(scriptUrl: string, options?: RegistrationOptions): Promise<unknown>
}

interface OfflineSupportOptions {
  isProduction: boolean
  baseUrl: string
  serviceWorker?: ServiceWorkerRegistrar
}

export async function registerOfflineSupport({
  isProduction,
  baseUrl,
  serviceWorker,
}: OfflineSupportOptions): Promise<void> {
  if (!isProduction || !serviceWorker) return

  await serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl })
}
