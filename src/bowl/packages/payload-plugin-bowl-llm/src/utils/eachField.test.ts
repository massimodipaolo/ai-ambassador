// readme https://testing-library.com/
import { Field } from 'payload/types';
import { PRESENTATION_FIELDS, eachDataField, eachField } from './eachField';

// TextField | NumberField | EmailField | TextareaField | CheckboxField | DateField |
// BlockField | GroupField | RadioField | RelationshipField | ArrayField | RichTextField |
// SelectField | UploadField | CodeField | JSONField | PointField | RowField | CollapsibleField |
// TabsField | UIField
const dataFields: Field[] = [
  { type: 'text', name: 'text' },
  { type: 'number', name: 'number' },
  { type: 'email', name: 'email' },
  { type: 'textarea', name: 'textarea' },
  { type: 'checkbox', name: 'checkbox' },
  { type: 'date', name: 'date' },
  {
    type: 'radio', name: 'radio', options: [
      { label: 'label', value: 'value' }
    ]
  },
  { type: 'relationship', name: 'relationship', relationTo: 'collection' },
  { type: 'richText', name: 'richText' },
  {
    type: 'select', name: 'select', options: [
      { label: 'label', value: 'value' }
    ]
  },
  { type: 'upload', name: 'upload', relationTo: 'collection' },
  { type: 'code', name: 'code' },
  { type: 'json', name: 'json' },
  { type: 'point', name: 'point' },
  { type: 'ui', name: 'ui', admin: {} },
];
const dataFieldsTypes = dataFields.map(x => x.type);
const groupFields = [
  {
    type: 'array', name: 'array', fields: dataFields
  },
  {
    type: 'blocks', name: 'blocks', blocks: [
      { slug: 'block', fields: dataFields }
    ]
  },
  {
    type: 'collapsible', label: 'collapsible', fields: dataFields
  },
  {
    type: 'group', name: 'group', fields: dataFields
  },
  {
    type: 'row', fields: dataFields
  },
  {
    type: 'tabs', label: 'tabs', tabs: [
      { name: 'tab', fields: dataFields }
    ]
  }
];
const groupFieldsTypes = groupFields.map(x => x.type);
const fields: Field[] = [
  ...dataFields,
  {
    type: 'array', name: 'array', fields: dataFields
  },
  {
    type: 'blocks', name: 'blocks', blocks: [
      { slug: 'block', fields: dataFields }
    ]
  },
  {
    type: 'collapsible', label: 'collapsible', fields: dataFields
  },
  {
    type: 'group', name: 'group', fields: dataFields
  },
  {
    type: 'row', fields: dataFields
  },
  {
    type: 'tabs', label: 'tabs', tabs: [
      { name: 'tab', fields: dataFields }
    ]
  },
];
const fieldsTypes: string[] = [...dataFieldsTypes];
groupFieldsTypes.forEach(type => {
  fieldsTypes.push(type);
  fieldsTypes.push(...dataFieldsTypes);
});

describe('eachField', () => {
  test('set cycle through all field types', () => {
    const types: string[] = [];
    eachField(fields, (field) => {
      types.push(field.type);
    });
    expect(types.length).toEqual(fieldsTypes.length);
    expect(types).toEqual(fieldsTypes);
  });
});

describe('eachDataField', () => {
  test('set cycle through all field types', () => {
    const dataFieldsTypes = fieldsTypes.filter(x => !PRESENTATION_FIELDS.includes(x));
    const types: string[] = [];
    eachDataField(fields, (field) => {
      types.push(field.type);
    });
    expect(types.length).toEqual(dataFieldsTypes.length);
    expect(types).toEqual(dataFieldsTypes);
  });
});
