import { Button } from 'payload/components/elements';
import { useField, useFormFields } from 'payload/components/forms';
import React from 'react';
import { toast } from 'react-toastify';

const FineTune: React.FC = () => {
  const appKey = useFormFields(
    ([fields]) => fields['settings.credentials.appKey']
  );
  const apiKey = useFormFields(
    ([fields]) => fields['settings.credentials.apiKey']
  );
  const { setValue } = useField<string>({
    path: 'settings.fineTuning.currentJobId',
  });

  const handleClick = async () => {
    const httpResponse = await fetch('/bowl/api/llm/fine-tuning?locale=it', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      referrer: '',
      body: JSON.stringify({
        appKey: appKey.initialValue,
        apiKey: apiKey.initialValue,
      }),
    });
    const response = await httpResponse.json();
    if (httpResponse.ok) {
      setValue(response.id);
      toast.success('Job avviato con successo');
    } else {
      toast.error(response.message);
    }
  };

  return (
    <div>
      <Button onClick={handleClick}>Avvia nuovo job</Button>
    </div>
  );
};

export default FineTune;
