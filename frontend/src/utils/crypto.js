// Helper functions for ArrayBuffer to Base64 conversions
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate RSA-OAEP Keypair
export async function generateE2EEKeypair() {
  const keypair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keypair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keypair.privateKey);

  return {
    publicKeyStr: JSON.stringify(publicKeyJwk),
    privateKeyStr: JSON.stringify(privateKeyJwk)
  };
}

// Ensure the current user has keys generated and stored in localStorage for their userId
export async function getOrGenerateMyKeys(userId, apiInstance) {
  if (!userId) return null;
  const privKeyName = `pc_e2ee_priv_${userId}`;
  const pubKeyName = `pc_e2ee_pub_${userId}`;

  let priv = localStorage.getItem(privKeyName);
  let pub = localStorage.getItem(pubKeyName);

  if (!priv || !pub) {
    try {
      const keys = await generateE2EEKeypair();
      localStorage.setItem(privKeyName, keys.privateKeyStr);
      localStorage.setItem(pubKeyName, keys.publicKeyStr);
      priv = keys.privateKeyStr;
      pub = keys.publicKeyStr;

      // Register the public key to the server
      if (apiInstance) {
        await apiInstance.updatePublicKey(pub);
      }
    } catch (err) {
      console.error("Failed to generate or register E2EE keys:", err);
    }
  }

  return { publicKeyStr: pub, privateKeyStr: priv };
}

// Encrypt a message content (text or JSON) for recipient and sender
export async function encryptMessage(content, recipientPublicKeyStr, myPublicKeyStr) {
  try {
    if (!recipientPublicKeyStr) {
      throw new Error("No recipient public key available.");
    }

    // 1. Generate a random 256-bit AES-GCM key
    const aesKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );

    // 2. Encrypt the plaintext content with AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encEncoder = new TextEncoder();
    const encodedContent = encEncoder.encode(content);
    
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      aesKey,
      encodedContent
    );

    const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);
    const ivBase64 = arrayBufferToBase64(iv);

    // 3. Export raw AES key to encrypt it asymmetrically
    const rawAesKeyBuffer = await window.crypto.subtle.exportKey("raw", aesKey);

    // 4. Import recipient public key
    const recipientPubKeyJwk = JSON.parse(recipientPublicKeyStr);
    const recipientPubKey = await window.crypto.subtle.importKey(
      "jwk",
      recipientPubKeyJwk,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      false,
      ["encrypt"]
    );

    // 5. Encrypt raw AES key with recipient's public key
    const encryptedKeyRecipientBuffer = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientPubKey,
      rawAesKeyBuffer
    );
    const encKeyRecipientBase64 = arrayBufferToBase64(encryptedKeyRecipientBuffer);

    // 6. Import our own public key so we can read our sent messages
    let encKeySenderBase64 = "";
    if (myPublicKeyStr) {
      const myPubKeyJwk = JSON.parse(myPublicKeyStr);
      const myPubKey = await window.crypto.subtle.importKey(
        "jwk",
        myPubKeyJwk,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        false,
        ["encrypt"]
      );

      const encryptedKeySenderBuffer = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        myPubKey,
        rawAesKeyBuffer
      );
      encKeySenderBase64 = arrayBufferToBase64(encryptedKeySenderBuffer);
    }

    // Return the secure E2EE envelope
    return JSON.stringify({
      e2ee: true,
      iv: ivBase64,
      cipher: ciphertextBase64,
      recipientKey: encKeyRecipientBase64,
      senderKey: encKeySenderBase64
    });
  } catch (err) {
    console.error("Encryption error:", err);
    throw err;
  }
}

// Decrypt an E2EE message envelope
export async function decryptMessage(envelopeStr, myPrivateKeyStr, isSentByMe) {
  try {
    const envelope = JSON.parse(envelopeStr);
    if (!envelope.e2ee) {
      return envelopeStr; // Return raw content if not encrypted
    }

    const { iv, cipher, recipientKey, senderKey } = envelope;
    const encryptedAesKeyBase64 = isSentByMe ? senderKey : recipientKey;

    if (!encryptedAesKeyBase64) {
      throw new Error("Target encrypted key not found in envelope.");
    }

    // 1. Import our private key
    const privateKeyJwk = JSON.parse(myPrivateKeyStr);
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      privateKeyJwk,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      false,
      ["decrypt"]
    );

    // 2. Decrypt the AES key
    const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedAesKeyBase64);
    const decryptedAesKeyRaw = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedAesKeyBuffer
    );

    // 3. Import the decrypted AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      decryptedAesKeyRaw,
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["decrypt"]
    );

    // 4. Decrypt the ciphertext
    const ivBuffer = base64ToArrayBuffer(iv);
    const ciphertextBuffer = base64ToArrayBuffer(cipher);

    const decryptedContentBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer
      },
      aesKey,
      ciphertextBuffer
    );

    const textDecoder = new TextDecoder();
    return textDecoder.decode(decryptedContentBuffer);
  } catch (err) {
    console.error("Decryption error:", err);
    return "[Encrypted Chat Message - Tap to decrypt failed or key missing]";
  }
}
