import { Asset } from '../types/editor.types';
import { textTemplatesA } from './templates/text-templates-a';
import { textTemplatesB } from './templates/text-templates-b';
import { textTemplatesC } from './templates/text-templates-c';

export const textTemplates: Asset[] = [
  ...textTemplatesA,
  ...textTemplatesB,
  ...textTemplatesC,
];
