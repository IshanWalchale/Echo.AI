import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
} from '@mui/material';

const AI_MODELS = {
  "General Knowledge": ["Gemini"],
  "Code Generation": ["Mistral"],
  "Text Analysis": ["Cohere"],
  "Creative Writing": ["ChatGPT"],
  "Multilingual Support": ["Qwen"],
  "Deep Learning": ["Deepseek"],
  "Art Generation": ["Rogue Rose"],
  "Summarization": ["Meta"]
};

const ModelSelectionDialog = ({ open, onClose, selectedModels, onModelSelect }) => {
  const handleModelToggle = (model, category) => {
    const newSelectedModels = { ...selectedModels };
    if (newSelectedModels[model]) {
      delete newSelectedModels[model];
    } else {
      newSelectedModels[model] = category;
    }
    onModelSelect(newSelectedModels);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select AI Models by Expertise</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {Object.entries(AI_MODELS).map(([category, models]) => (
            <Grid item xs={12} key={category}>
              <Typography variant="h6" gutterBottom>
                {category}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {models.map((model) => (
                  <FormControlLabel
                    key={model}
                    control={
                      <Checkbox
                        checked={!!selectedModels[model]}
                        onChange={() => handleModelToggle(model, category)}
                      />
                    }
                    label={model}
                  />
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModelSelectionDialog; 