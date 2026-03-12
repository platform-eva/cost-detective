{{- define "cd.namespace" -}}
{{- .Values.namespace | default .Release.Namespace -}}
{{- end -}}
