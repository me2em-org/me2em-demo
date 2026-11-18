import { useState, useCallback } from 'react';
import { Identity } from '@me2em/core';
import { logger } from '../utils/logger';
import { generateSeedPhrase, get32ByteSeedFromMnemonic } from '../utils/crypto';

export type ServiceData = {
  name: string;
  handleId: string;
  password: string;
  login?: string;
};

export function useMe2em() {
  const [seedPhrase, setSeedPhrase] = useState<string[] | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [services, setServices] = useState<Record<string, ServiceData>>({});

  const generateNewSeed = useCallback(() => {
    logger.info('Генерация 12-словной BIP39 фразы...');
    const phrase = generateSeedPhrase();
    setSeedPhrase(phrase);
    logger.success('Seed фраза сгенерирована', phrase.join(' '));
    return phrase;
  }, []);

  const createIdentityFromSeed = useCallback(async (phrase: string[]) => {
    logger.info('Конвертация BIP39 фразы в 32-байтовый seed...');
    const seedBytes = await get32ByteSeedFromMnemonic(phrase);
    
    logger.info('Создание Identity из seed...');
    const identityInstance = await Identity.fromSeed(seedBytes);
    setIdentity(identityInstance);
    
    const pubKeyBytes = identityInstance.getPublicKey();
    const pubKeyHex = Array.from(pubKeyBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
    logger.success('Identity создана');
    logger.info('Публичный ключ Identity', pubKeyHex);
    
    return identityInstance;
  }, []);

  const deriveServiceHandles = useCallback(async () => {
    if (!identity) throw new Error('Identity не создан');
    
    const newServices: Record<string, ServiceData> = {};
    const serviceNames = ['google', 'github'];

    for (const name of serviceNames) {
      logger.info(`Деривация Handle для "${name}"...`);
      const handle = await identity.deriveHandle(name, { displayName: `User @ ${name}` });
      const password = handle.derivePassword(name, 16); 
      
      newServices[name] = { name, handleId: handle.getId(), password };
      logger.success(`Handle и пароль для "${name}" созданы`, `ID: ${handle.getId()}`);
    }
    setServices(newServices);
  }, [identity]);

  const updateLogin = useCallback((serviceName: string, login: string) => {
    setServices(prev => ({ ...prev, [serviceName]: { ...prev[serviceName], login } }));
  }, []);

  const resetAll = useCallback(() => {
    setSeedPhrase(null);
    setIdentity(null);
    setServices({});
    localStorage.removeItem('me2em_demo_seed');
  }, []);

  return {
    seedPhrase,
    identity,
    services,
    generateNewSeed,
    createIdentityFromSeed,
    deriveServiceHandles,
    updateLogin,
    resetAll
  };
}
