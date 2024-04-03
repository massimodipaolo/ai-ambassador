// import { fieldHasSubFields, fieldIsArrayType, fieldIsBlockType } from 'payload/dist/fields/config/types';
import { Block, JSONField, Tab } from 'payload/dist/fields/config/types';
import {
  ArrayField, BlockField, CheckboxField, CodeField, CollapsibleField, DateField, EmailField, Field,
  NumberField, PointField, RadioField, RelationshipField, RichTextField, RowField, SelectField, TabsField,
  TextField, TextareaField, UIField, UploadField
} from 'payload/types';

export type PresentationField = CollapsibleField | RowField | TabsField | UIField;

export const PRESENTATION_FIELDS = ['collapsible', 'row', 'tabs', 'ui'];

export function isPresentationField(field: Field): field is PresentationField {
  return PRESENTATION_FIELDS.includes(field.type);
}

export type DataField = JSONField | TextField | NumberField | EmailField | TextareaField | CheckboxField | DateField | BlockField | RadioField | RelationshipField | ArrayField | RichTextField | SelectField | UploadField | CodeField | PointField;

export function isDataField(field: Field): field is DataField {
  return !PRESENTATION_FIELDS.includes(field.type);
}

type eachFieldAcc = { maxDepth: number, depth: number, paths: string[], parent?: Field | Block | Tab };

export function eachField(fields: Field[], callback: (field: Field, paths: string[], parent?: Field | Block | Tab) => boolean | void, options?: number | eachFieldAcc): boolean | void {
  const acc: eachFieldAcc = (
    typeof options === 'number' ? {
      paths: [],
      depth: 0,
      maxDepth: options,
    } : (
      typeof options === 'object' ?
        options :
        {
          paths: [],
          depth: 0,
          maxDepth: -1,
        }
    )
  );
  for (const field of fields) {
    let shouldBreak = callback(field, acc.paths, acc.parent);
    if (shouldBreak === true) {
      return shouldBreak;
    }
    let nextAcc: eachFieldAcc = {
      ...acc,
      paths: [...acc.paths],
      parent: field,
    };
    if (isDataField(field)) {
      nextAcc.paths.push(field.name);
    }
    if (acc.maxDepth === -1 || acc.depth < acc.maxDepth || isPresentationField(field)) {
      switch (field.type) {
        case 'array':
          // console.log('array', field);
          nextAcc.depth++;
          shouldBreak = eachField(field.fields, callback, nextAcc);
          break;
        case 'blocks':
          // console.log('blocks', field);
          nextAcc.depth++;
          for (const block of field.blocks) {
            nextAcc = {
              ...nextAcc,
              parent: block,
            };
            shouldBreak = eachField(block.fields, callback, nextAcc);
            if (shouldBreak === true) {
              return shouldBreak;
            }
          }
          /*
          for (const [key, block] of Object.entries(field.blocks)) {
            nextAcc = {
              maxDepth: nextAcc.maxDepth,
              depth: nextAcc.depth + 1,
              paths: [...nextAcc.paths, key],
            };
            shouldBreak = eachField(block.fields, callback, nextAcc);
            if (shouldBreak === true) {
              return shouldBreak;
            }
          }
          */
          break;
        case 'collapsible':
        case 'group':
        case 'row':
          // console.log('row', field);
          shouldBreak = eachField(field.fields, callback, nextAcc);
          break;
        case 'tabs':
          // console.log('tabs', field);
          for (const tab of field.tabs) {
            shouldBreak = eachField(tab.fields, callback, nextAcc);
            if (shouldBreak === true) {
              return shouldBreak;
            }
          }
      }
      if (shouldBreak === true) {
        return shouldBreak;
      }
    }
  }
}

export function eachDataField(fields: Field[], callback: (field: DataField, paths: string[], parent?: Field | Block | Tab) => boolean | void, maxDepth: number = -1): boolean | void {
  return eachField(fields, (field: Field, paths: string[], parent?: Field | Block | Tab) => {
    if (isDataField(field)) {
      return callback(field, paths, parent);
    }
  }, maxDepth);
}
