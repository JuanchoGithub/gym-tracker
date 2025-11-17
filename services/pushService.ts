// This VAPID public key is used to authenticate with the push service.
// You should generate your own VAPID keys using a library like `web-push`
// and replace this key with your public key.
// To generate keys: `npx web-push generate-vapid-keys`
const applicationServerPublicKey = 'BGl_e_0E393-qO07Zt_V-c827o4D20SJ9f-zWl7Q8t_5n1eYp_g-qB3eN3j5d6_e7f8_g9h0i1_j2k3';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUser(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported by this browser.');
    return;
  }

  try {
    const swRegistration = await navigator.serviceWorker.ready;
    let subscription = await swRegistration.pushManager.getSubscription();

    if (subscription === null) {
      console.log('Not subscribed, attempting to subscribe...');
      const applicationServerKey = urlBase64ToUint8Array(applicationServerPublicKey);
      subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      console.log('User is subscribed:', subscription);

      // TODO: Send subscription to your backend server
      console.log('--- SUBSCRIPTION OBJECT ---');
      console.log('This JSON object should be sent to your backend server to save it.');
      console.log(JSON.stringify(subscription));
      console.log('---------------------------');
      
      // Example of how you would send it to a server:
      /*
      await fetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      */
    } else {
      console.log('User is already subscribed.');
    }
  } catch (error) {
    console.error('Failed to subscribe the user: ', error);
  }
}
