import React from 'react';
import { useNavigation } from '../../../context';
import { ServicesScreen } from './ServicesScreen';
import { ChantListScreen } from './ChantListScreen';

/** „ღვთისმსახურება“ in the new look: the services, or the chant list of the service picked. */
export const GalobaV2: React.FC = () => {
  const { selectedService } = useNavigation();
  return selectedService ? <ChantListScreen /> : <ServicesScreen />;
};

export default GalobaV2;
