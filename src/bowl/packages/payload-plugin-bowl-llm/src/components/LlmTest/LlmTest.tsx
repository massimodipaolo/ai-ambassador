import { Eyebrow } from 'payload/components/elements';
import { Form } from 'payload/components/forms';
import { useStepNav } from 'payload/components/hooks';
import { DefaultTemplate } from 'payload/components/templates';
import { Meta, useConfig, useLocale } from 'payload/components/utilities';
import { AdminView } from 'payload/config';
import { Data, Fields } from 'payload/dist/admin/components/forms/Form/types';
import FormSubmit from 'payload/dist/admin/components/forms/Submit';
import fieldTypes from 'payload/dist/admin/components/forms/field-types';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Redirect } from 'react-router-dom';
import { toast } from 'react-toastify';
import { PythonStreamResponse } from '../../api/python/pythonStream.handler';
import { LlmApp, LlmDecodedMessage, LlmMessage } from '../../api/types';
import './Llm.scss';
import { LlmChatCompletion } from './LlmChatCompletion';
import { LlmThread } from './LlmThread';

export const LlmTest_: AdminView = ({ user, canAccessAdmin }) => {

  const { t } = useTranslation('llm');
  const { localization, routes, serverURL } = useConfig();
  const { admin: adminRoute } = routes;
  const locale = useLocale();
  const { setStepNav } = useStepNav();
  const [response, setResponse] = useState<PythonStreamResponse>();
  const [messages, setMessages] = useState<LlmDecodedMessage[]>([]);
  const [completion, setCompletion] = useState<LlmMessage[] | undefined>();
  const [apps, setApps] = useState<LlmApp[]>([]);
  const [app, setApp] = useState<LlmApp>();

  // console.log('LlmTest', serverURL, routes.api, locale);

  React.useEffect(() => {
    setStepNav([
      {
        label: 'Llm Test',
      },
    ]);
  }, [setStepNav]);

  // fetch apps
  useEffect(() => {
    const fetchApps = () => {
      fetch(`${serverURL}${routes.api}/llmApp?pagination=false&locale=${locale}`)
        .then(response => response.json())
        .then(apps => setApps(apps));
    };
    fetchApps();
  }, [locale, routes.api, serverURL]);

  // reset thread
  useEffect(() => {
    setMessages([]);
    setCompletion(undefined);
  }, [app]);

  const initialFormData = useMemo(() => ({
    message: null,
  }), []);

  const Select = fieldTypes.select;
  const selectOptions = useMemo(() => {
    return apps.map(x => ({
      label: x.name,
      value: x.id,
    }));
  }, [apps]);

  const Textarea = fieldTypes.textarea;
  const textareaOptions = useMemo(() => {
    /*
    const validate: Validate = (value, args) => {
      // console.log('validate', value, args);
      return true;
    };
    */
    return {
      permissions: {},
      // validate,
      path: 'message',
      fieldTypes,
      admin: {
        placeholder: 'Type you message',
      },
    };
  }, []);

  const sendMessage = (content: string) => {
    const message = {
      role: 'user',
      content,
      chunks: [{
        type: 'string',
        content,
      }],
    };
    // console.log('LlmTestDefault.sendMessage', message);
    const completion = [...messages, message];
    setMessages(completion);
    setCompletion(completion);
  };

  const onSubmit = async (fields: Fields, data: Data) => {
    if (!data.message) {
      return;
    }
    if (fields.message) {
      fields.message.value = '';
    }
    sendMessage(data.message);
  };

  const onError = (error: any) => {
    console.log('LlmTestDefault.onError', error);
    toast.error(`An error occurred: ${error.message}.`);
  };

  const onEnd = (response: PythonStreamResponse) => {
    // console.log('LlmTestDefault.onEnd', response);
    const content = response.chunks.map(x => {
      let text = '';
      switch (x.type) {
        case 'string':
          text += x.content;
          break;
        default:
          text += JSON.stringify(x);
      }
      return text;
    }).join('\r\n');
    const message = {
      role: 'assistant',
      content,
      chunks: response.chunks,
    };
    setResponse(response);
    setMessages([...messages, message]);
    setCompletion(undefined);
  };

  const onSelectDidChange = (value: string) => {
    const app = apps.find(x => x.id === value);
    setApp(app);
    // console.log('onSelectDidChange', app);
  };

  if (!user || (user && !canAccessAdmin)) {
    return (
      <Redirect to={`${adminRoute}/unauthorized`} />
    );
  }

  return (
    <DefaultTemplate className="llm">
      <Meta
        title="Llm Test"
        description="I'm an helpful llm endpoint tester!"
        keywords="payloadcms llm test"
      />
      <Form onSubmit={onSubmit} initialData={initialFormData}>
        <Eyebrow />
        <div className="gutter--left gutter--right llm__container">
          <div className="llm__app">
            <Select label={t('llmTest:selectApp')} name="select" path="select" options={selectOptions} validate={onSelectDidChange} />
          </div>
          {app && (
            <>
              <div className="llm__head">
                <h1>{app.name}</h1>
                <div className="llm__row">
                  <h4>System Message</h4>
                  <pre>{app.settings.llmConfig.prompt.systemMessage}</pre>
                </div>
                <div className="llm__row llm__flex">
                  {app.contents.sampleInputTexts.map((x, i) => (
                    <button key={`sampleInputTexts_${i}`} type="button" className="btn btn--style-secondary btn--size-small"
                      onClick={() => sendMessage(x.sampleInputText)}
                    >
                      {x.sampleInputText}
                    </button>
                  ))}
                </div>
                <div className="llm__row llm__flex">
                  {app.contents.layoutBuilder.map((x, i) => (
                    <button key={`sampleInputTexts_${i}`} type="button" className="btn btn--style-secondary btn--size-small"
                      onClick={() => sendMessage(x.message)}
                    >
                      {x.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="llm__main">
                <LlmThread messages={messages} />
                {completion && (
                  <LlmChatCompletion
                    apiKey={app.settings.credentials.apiKey}
                    appKey={app.settings.credentials.appKey}
                    completion={completion}
                    test={false}
                    threadId={response?.threadId}
                    onEnd={onEnd}
                    onError={onError}
                  />
                )}
              </div>
              <div className="llm__foot">
                <Textarea {...textareaOptions} key={'message'} />
                <FormSubmit type="submit" disabled={false}>
                  {t('send')}
                </FormSubmit>
              </div>
            </>
          )}
        </div>
      </Form>
    </DefaultTemplate>
  );
};

export const LlmTest = React.memo(LlmTest_);
