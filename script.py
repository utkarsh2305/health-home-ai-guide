merged
  result 100644 33eca1b8b534cdfa1c55511dd0e991a1043de522 server/database/connection.py
  our    100644 be104a1b40166034d7113696d44cddfa9ff17a14 server/database/connection.py
@@ -63,6 +63,18 @@
 
     def _set_initial_default_template(self):
         try:
+            # Get the latest non-deleted Phlox template
+            self.cursor.execute(
+                "SELECT template_key FROM clinical_templates WHERE template_key LIKE 'phlox%' AND (deleted IS NULL OR deleted != 1) ORDER BY created_at DESC LIMIT 1"
+            )
+            phlox_template = self.cursor.fetchone()
+
+            if not phlox_template:
+                logging.error("No valid Phlox template found in the database")
+                return
+
+            default_template_key = phlox_template["template_key"]
+
             # Check if user_settings table is empty
             self.cursor.execute("SELECT COUNT(*) FROM user_settings")
             count = self.cursor.fetchone()[0]
@@ -71,21 +83,41 @@
                 # Create initial settings with default template
                 self.cursor.execute(
                     "INSERT INTO user_settings (default_template_key) VALUES (?)",
-                    ("phlox_01",)
+                    (default_template_key,)
                 )
-                logging.info("Created initial user settings with default template")
+                logging.info(f"Created initial user settings with default template: {default_template_key}")
             else:
-                # Check if default template is set
+                # Get current default template
                 self.cursor.execute(
-                    "SELECT default_template_key FROM user_settings LIMIT 1"
+                    "SELECT id, default_template_key FROM user_settings LIMIT 1"
                 )
                 row = self.cursor.fetchone()
-                if not row["default_template_key"]:
+                current_default = row["default_template_key"]
+
+                # Check if default template is not set or is invalid
+                need_update = False
+
+                if not current_default:
+                    need_update = True
+                    logging.info("No default template currently set")
+                else:
+                    # Verify the current default template exists and is not deleted
+                    self.cursor.execute(
+                        "SELECT 1 FROM clinical_templates WHERE template_key = ? AND (deleted IS NULL OR deleted != 1)",
+                        (current_default,)
+                    )
+                    template_exists = self.cursor.fetchone() is not None
+
+                    if not template_exists:
+                        need_update = True
+                        logging.info(f"Current default template '{current_default}' is invalid or deleted")
+
+                if need_update:
                     self.cursor.execute(
                         "UPDATE user_settings SET default_template_key = ? WHERE id = ?",
-                        ("phlox_01", row["id"])
+                        (default_template_key, row["id"])
                     )
-                    logging.info("Updated existing user settings with default template")
+                    logging.info(f"Updated default template to: {default_template_key}")
 
             self.db.commit()
         except Exception as e:
merged
  result 100644 25ebcb1d93658b71319b3e55af6ac4fd0dc8eb17 server/rag/chroma.py
  our    100644 6873695f9496fc3939201f8c190ccbbda4dd2ffe server/rag/chroma.py
@@ -388,7 +388,7 @@
                 },
                 {
                     "role": "user",
-                    "content": f"{sample_text}\n\nIs the block of text focused on diagnosis, treatment, epidemiology, pathophysiology, prognosis, clinical features, prevention, or miscellaneous? (answer only with one word)",
+                    "content": f"{sample_text}\n\nIs the block of text focused on guidelines, diagnosis, treatment, epidemiology, pathophysiology, prognosis, clinical features, prevention, or miscellaneous? (answer only with one word)",
                 },
             ],
             options=disease_question_options,
merged
  result 100644 45190070f70c09eda6505b1932b5f0fd0ba53bf6 server/rag/processing.py
  our    100644 a4f5d2f8d9ec1cf24777b5389d8802813a909aa1 server/rag/processing.py
@@ -121,7 +121,7 @@
             },
             {
                 "role": "user",
-                "content": f"{sample_text}\n\nIs the block of text focused on diagnosis, treatment, epidemiology, pathophysiology, prognosis, clinical features, prevention, or miscellaneous? (answer only with one word)",
+                "content": f"{sample_text}\n\nIs the block of text focused on guidelines, diagnosis, treatment, epidemiology, pathophysiology, prognosis, clinical features, prevention, or miscellaneous? (answer only with one word)",
             },
         ],
         options=disease_question_options,
merged
  result 100644 cfa1c308a473151fa53dff9762a8e80c04fb14d7 server/schemas/grammars.py
  our    100644 cd9600c88bfe8792a680e34e4cb2127e1da91284 server/schemas/grammars.py
@@ -20,6 +20,23 @@
         description="Individual discussion points extracted from the transcript"
     )
 
+class RefinedResponse(BaseModel):
+    """
+    Structured model where each individual discussion point
+    is in its own entry in the list.
+    """
+    key_points: List[str] = Field(
+        description="Individual discussion points extracted and refined as per the system prompt"
+    )
+
+class NarrativeResponse(BaseModel):
+    """
+    Structured model where the content is returned as a narrative paragraph.
+    """
+    narrative: str = Field(
+        description="A narrative paragraph summarizing the content in a cohesive, flowing text"
+    )
+
 # Reasoning
 
 class ClinicalReasoning(BaseModel):
changed in both
  base   100644 2e02ebe11e643cd0fd29297d37898ef133384c9b server/utils/transcription.py
  our    100644 b07e7db2d38e422aed66dec2e83e7f936030b35e server/utils/transcription.py
  their  100644 998346d2cc49e76e7367e5fe0fe4175feeac7205 server/utils/transcription.py
@@ -7,7 +7,7 @@
 from ollama import AsyncClient as AsyncOllamaClient
 from server.database.config import config_manager
 from server.schemas.templates import TemplateField, TemplateResponse
-from server.schemas.grammars import FieldResponse
+from server.schemas.grammars import FieldResponse, RefinedResponse
 
 # Configure logging
 logging.basicConfig(level=logging.INFO)
@@ -122,7 +122,7 @@
             )
             for field in non_persistent_fields
         ])
-
+        print(raw_results)
         # Refine all results concurrently
         refined_results = await asyncio.gather(*[
             refine_field_content(
@@ -149,56 +149,6 @@
         logger.error(f"Error in process_transcription: {e}")
         raise
 
-async def process_template_field_old(
-    transcript_text: str,
-    field: TemplateField,
-    patient_context: Dict[str, str]
-) -> TemplateResponse:
-    """
-    Process a single template field using the specified prompts and format.
-
-    Args:
-        transcript_text (str): The transcribed text.
-        field (TemplateField): The field to process.
-        patient_context (Dict[str, str]): Patient context.
-
-    Returns:
-        TemplateResponse: The processed field content.
-    """
-    try:
-        config = config_manager.get_config()
-        client = AsyncOllamaClient(host=config["OLLAMA_BASE_URL"])
-        options = config_manager.get_prompts_and_options()["options"]["general"]
-
-        # Build request body with system and user messages
-        request_body = [
-            {"role": "system", "content": field.system_prompt},
-            {"role": "system", "content": _build_patient_context(patient_context)},
-            {"role": "user", "content": transcript_text},
-            {"role": "assistant", "content": field.initial_prompt}
-        ]
-
-        response = await client.chat(
-            model=config["PRIMARY_MODEL"],
-            messages=request_body,
-            format=field.format_schema if field.format_schema else None,
-            options=options
-        )
-
-        # Get the part after the last linebreak in initial_prompt (if any)
-        prefix_to_prepend = field.initial_prompt.split('\n')[-1] if '\n' in field.initial_prompt else ''
-
-        # Prepend the prefix only if it exists
-        full_content = f"{prefix_to_prepend} {response['message']['content']}" if prefix_to_prepend else response['message']['content']
-
-        return TemplateResponse(
-            field_key=field.field_key,
-            content=full_content
-        )
-    except Exception as e:
-        logger.error(f"Error processing template field {field.field_key}: {e}")
-        raise
-
 async def process_template_field(
     transcript_text: str,
     field: TemplateField,
@@ -241,15 +191,14 @@
             format=response_format,
             options={**options, "temperature": 0}
         )
-        print(response)
-        # Parse the response
+
         field_response = FieldResponse.model_validate_json(
             response['message']['content']
         )
 
         # Convert key points into a nicely formatted string
         formatted_content = "\n".join(f"• {point.strip()}" for point in field_response.key_points)
-        print(formatted_content)
+
         return TemplateResponse(
             field_key=field.field_key,
             content=formatted_content
@@ -294,29 +243,80 @@
         prompts = config_manager.get_prompts_and_options()
         options = prompts["options"]["general"]
 
+        # Determine the response format and system prompt based on field format_schema
+        format_type = None
+        if field.format_schema and "type" in field.format_schema:
+            format_type = field.format_schema["type"]
+
+            if format_type == "narrative":
+                response_format = NarrativeResponse.model_json_schema()
+                system_prompt = "Format the following content as a cohesive narrative paragraph."
+            else:
+                response_format = RefinedResponse.model_json_schema()
+
+                # Add format guidance to the system prompt
+                format_guidance = ""
+                if format_type == "numbered":
+                    format_guidance = "Format the key points as a numbered list (1., 2., etc.)."
+                elif format_type == "bullet":
+                    format_guidance = "Format the key points as a bulleted list (•) prefixes)."
+
+                system_prompt = prompts["prompts"]["refinement"]["system"] + "\n" + format_guidance
+        else:
+            # Default to RefinedResponse
+            response_format = RefinedResponse.model_json_schema()
+            system_prompt = prompts["prompts"]["refinement"]["system"]
+
+        # Override with custom refinement rules if specified
+        if field.refinement_rules:
+            # Check if rules are provided and exist in the prompts configuration
+            for rule in field.refinement_rules:
+                if rule in prompts["prompts"]["refinement"]:
+                    system_prompt = prompts["prompts"]["refinement"][rule]
+                    break
+
         request_body = [
-            {"role": "system", "content": prompts["prompts"]["refinement"]["system"]},
+            {"role": "system", "content": system_prompt},
             {"role": "user", "content": content},
-            {"role": "assistant", "content": field.initial_prompt}
         ]
 
         response = await client.chat(
             model=config["PRIMARY_MODEL"],
             messages=request_body,
-            format=field.format_schema if field.format_schema else None,
+            format=response_format,
             options=options
         )
 
-        # Get the part after the last linebreak in initial_prompt (if any)
-        prefix_to_prepend = field.initial_prompt.split('\n')[-1] if '\n' in field.initial_prompt else ''
-
-        # Prepend the prefix only if it exists
-        full_content = f"{prefix_to_prepend} {response['message']['content']}" if prefix_to_prepend else response['message']['content']
-
-        # Clean the double spaces
-        cleaned_content = clean_list_spacing(full_content)
+        # Process response based on format type
+        if format_type == "narrative":
+            narrative_response = NarrativeResponse.model_validate_json(response['message']['content'])
+            return narrative_response.narrative
+        else:
+            refined_response = RefinedResponse.model_validate_json(response['message']['content'])
+
+            # Apply formatting based on format_type
+            if format_type == "numbered":
+                formatted_key_points = []
+                for i, point in enumerate(refined_response.key_points):
+                    # Strip any existing numbering
+                    cleaned_point = re.sub(r'^\d+\.\s*', '', point.strip())
+                    formatted_key_points.append(f"{i+1}. {cleaned_point}")
+                return "\n".join(formatted_key_points)
+            elif format_type == "bullet":
+                bullet_char = "•"  # Default bullet character
+                if field.format_schema and "bullet_char" in field.format_schema:
+                    bullet_char = field.format_schema["bullet_char"]
+
+                formatted_key_points = []
+                for point in refined_response.key_points:
+                    # Strip any existing bullets
+                    cleaned_point = re.sub(r'^[•\-\*]\s*', '', point.strip())
+                    formatted_key_points.append(f"{bullet_char} {cleaned_point}")
+                return "\n".join(formatted_key_points)
+            else:
+                # No specific formatting required
+                return "\n".join(refined_response.key_points)
 
-        return cleaned_content
     except Exception as e:
         logger.error(f"Error refining field {field.field_key}: {e}")
         raise
@@ -342,6 +342,7 @@
         context_parts.append(f"DOB: {context['dob']}")
 
     return " ".join(context_parts)
+<<<<<<< .our
 
 async def process_template(
     transcript_text: str,
@@ -416,3 +417,5 @@
         return "recording.m4a", "audio/mp4"
     # Default to WAV if we can't determine
     return "recording.wav", "audio/wav"
+=======
+>>>>>>> .their
merged
  result 100644 625f2dac234c24b28cf1eb2d83a79666af4be8dc src/components/settings/TemplateEditor.js
  our    100644 3093aca295ac691c2174640682e66e7a68be970c src/components/settings/TemplateEditor.js
@@ -271,30 +271,30 @@
                                                     "none"
                                                 }
                                                 onChange={(e) => {
-                                                    const schema =
-                                                        e.target.value ===
-                                                        "none"
-                                                            ? null
-                                                            : {
-                                                                  type: e.target
-                                                                      .value,
-                                                                  pattern:
-                                                                      e.target
-                                                                          .value ===
-                                                                      "bullet"
-                                                                          ? "^[•\\-] .+"
-                                                                          : e
-                                                                                  .target
-                                                                                  .value ===
-                                                                              "numbered"
-                                                                            ? "^\\d+\\. .+"
-                                                                            : null,
-                                                              };
-                                                    updateField(
-                                                        idx,
-                                                        "format_schema",
-                                                        schema,
-                                                    );
+                                                    const value =
+                                                        e.target.value;
+                                                    if (value === "none") {
+                                                        updateField(
+                                                            idx,
+                                                            "format_schema",
+                                                            null,
+                                                        );
+                                                    } else {
+                                                        let schema = {
+                                                            type: value,
+                                                        };
+                                                        if (
+                                                            value === "bullet"
+                                                        ) {
+                                                            schema.bullet_char =
+                                                                "•"; // Default bullet
+                                                        }
+                                                        updateField(
+                                                            idx,
+                                                            "format_schema",
+                                                            schema,
+                                                        );
+                                                    }
                                                 }}
                                             >
                                                 <option value="none">
@@ -306,7 +306,54 @@
                                                 <option value="numbered">
                                                     Numbered List
                                                 </option>
+                                                <option value="narrative">
+                                                    Narrative Paragraph
+                                                </option>
                                             </Select>
+
+                                            {/* Show bullet character selector if bullet format is selected */}
+                                            {field.format_schema?.type ===
+                                                "bullet" && (
+                                                <Box mt={2}>
+                                                    <Text fontSize="sm" mb={1}>
+                                                        Bullet Character
+                                                    </Text>
+                                                    <Select
+                                                        size="sm"
+                                                        className="input-style"
+                                                        value={
+                                                            field.format_schema
+                                                                ?.bullet_char ||
+                                                            "•"
+                                                        }
+                                                        onChange={(e) => {
+                                                            updateField(
+                                                                idx,
+                                                                "format_schema",
+                                                                {
+                                                                    ...field.format_schema,
+                                                                    bullet_char:
+                                                                        e.target
+                                                                            .value,
+                                                                },
+                                                            );
+                                                        }}
+                                                    >
+                                                        <option value="•">
+                                                            • (Bullet)
+                                                        </option>
+                                                        <option value="-">
+                                                            - (Dash)
+                                                        </option>
+                                                        <option value="*">
+                                                            * (Asterisk)
+                                                        </option>
+                                                        <option value="→">
+                                                            → (Arrow)
+                                                        </option>
+                                                    </Select>
+                                                </Box>
+                                            )}
                                         </Box>
                                     </Tooltip>
                                     <Tooltip label="Rules for refining the AI's response">
