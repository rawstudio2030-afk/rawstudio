#!/usr/bin/env python3
"""
Clasificador AVANZADO de emails con acciones
- Clasifica SPAM vs LEGÍTIMO
- Agrupa por remitente
- Mueve/Elimina SPAM automáticamente
- Genera reportes ordenados
"""

import json
import base64
import re
import os
from datetime import datetime
from collections import defaultdict
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
import googleapiclient.discovery as discovery
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import joblib

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']  # Permiso para MODIFICAR emails

class GmailClassifierAvanzado:
    def __init__(self,
                 credentials_path='credentials.json',
                 token_path='token.pickle',
                 model_path='email_classifier_model.pkl'):
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.model_path = model_path
        self.service = None
        self.model = None
        self.log_file = 'classifier.log'
        self._log("Iniciando clasificador avanzado...")
        self.authenticate()

    def _log(self, message):
        """Guardar logs"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_msg = f"[{timestamp}] {message}"
        print(log_msg)
        with open(self.log_file, 'a') as f:
            f.write(log_msg + '\n')

    def authenticate(self):
        """Autenticar con Gmail API"""
        try:
            creds = None
            if os.path.exists(self.token_path):
                creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)

            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_path, SCOPES)
                    creds = flow.run_local_server(port=0)
                    with open(self.token_path, 'w') as token:
                        token.write(creds.to_json())

            self.service = discovery.build('gmail', 'v1', credentials=creds)
            self._log("✓ Autenticación exitosa")
        except Exception as e:
            self._log(f"✗ Error de autenticación: {e}")
            raise

    def get_emails(self, max_results=20, query=''):
        """Obtener emails"""
        try:
            results = self.service.users().messages().list(
                userId='me',
                q=query,
                maxResults=min(max_results, 20)
            ).execute()
            messages = results.get('messages', [])
            self._log(f"📧 Obtuvieron {len(messages)} emails")
            return messages
        except Exception as e:
            self._log(f"✗ Error obteniendo emails: {e}")
            return []

    def parse_email(self, message_id):
        """Extraer información del email"""
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()

            headers = message['payload']['headers']
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '(sin asunto)')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), '(desconocido)')
            date = next((h['value'] for h in headers if h['name'] == 'Date'), '')

            body = self._extract_body(message['payload'])
            full_text = f"{subject} {body}".lower()[:5000]

            return {
                'id': message_id,
                'subject': subject,
                'sender': sender,
                'date': date,
                'body_preview': body[:200],
                'full_text': full_text
            }
        except Exception as e:
            self._log(f"✗ Error parseando email {message_id}: {e}")
            return None

    def _extract_body(self, payload):
        """Extraer cuerpo del email"""
        try:
            if 'parts' in payload:
                for part in payload['parts']:
                    if part['mimeType'] == 'text/plain':
                        if 'data' in part['body']:
                            return base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                    elif part['mimeType'] == 'text/html':
                        if 'data' in part['body']:
                            html = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                            return re.sub('<[^<]+?>', '', html)
            else:
                if 'data' in payload['body']:
                    return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
            return ''
        except:
            return ''

    def train_model(self, spam_emails=None, ham_emails=None):
        """Entrenar modelo"""
        if spam_emails is None:
            spam_emails = [
                "Click here to win a prize! Act now!!!",
                "Urgent: Your account has been compromised. Verify credentials immediately",
                "Make $5000 from home! No experience needed",
                "congratulations! you won! claim your reward",
                "limited time offer - buy now!",
            ]

        if ham_emails is None:
            ham_emails = [
                "Hi, let's schedule a meeting for next week",
                "Your order has been shipped",
                "Team update: Sprint planning at 3pm today",
                "Meeting notes from today's standup",
                "Can you review this pull request?",
            ]

        try:
            texts = spam_emails + ham_emails
            labels = [1] * len(spam_emails) + [0] * len(ham_emails)

            self._log(f"🔄 Entrenando modelo con {len(texts)} ejemplos...")

            self.model = Pipeline([
                ('tfidf', TfidfVectorizer(max_features=500, stop_words='english')),
                ('classifier', MultinomialNB())
            ])

            self.model.fit(texts, labels)
            joblib.dump(self.model, self.model_path)
            self._log(f"✓ Modelo entrenado")
        except Exception as e:
            self._log(f"✗ Error entrenando modelo: {e}")
            raise

    def load_model(self):
        """Cargar modelo"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                return True
            else:
                self._log(f"⚠ Modelo no encontrado, entrenando nuevo...")
                self.train_model()
                return True
        except Exception as e:
            self._log(f"✗ Error cargando modelo: {e}")
            return False

    def classify_email(self, email_text):
        """Clasificar email"""
        if self.model is None:
            self.load_model()

        try:
            prediction = self.model.predict([email_text])[0]
            probability = self.model.predict_proba([email_text])[0]

            return {
                'is_spam': bool(prediction),
                'spam_probability': round(float(probability[1]), 4),
                'ham_probability': round(float(probability[0]), 4)
            }
        except Exception as e:
            self._log(f"✗ Error clasificando: {e}")
            return None

    def move_to_spam(self, message_id):
        """Mover email a spam"""
        try:
            self.service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'addLabelIds': ['SPAM']}
            ).execute()
            return True
        except Exception as e:
            self._log(f"✗ Error moviendo a spam: {e}")
            return False

    def delete_email(self, message_id):
        """Enviar email a papelera (no eliminar permanentemente)"""
        try:
            # En lugar de delete (permanente), usar trash (papelera)
            self.service.users().messages().trash(
                userId='me',
                id=message_id
            ).execute()
            return True
        except Exception as e:
            self._log(f"✗ Error enviando a papelera: {e}")
            return False

    def add_label(self, message_id, label_name):
        """Agregar etiqueta a email"""
        try:
            # Obtener lista de etiquetas
            results = self.service.users().labels().list(userId='me').execute()
            labels = results.get('labels', [])

            # Buscar si existe la etiqueta
            label_id = None
            for label in labels:
                if label['name'] == label_name:
                    label_id = label['id']
                    break

            # Si no existe, crearla
            if not label_id:
                label_body = {
                    'name': label_name,
                    'labelListVisibility': 'labelShow',
                    'messageListVisibility': 'show'
                }
                label_obj = self.service.users().labels().create(
                    userId='me',
                    body=label_body
                ).execute()
                label_id = label_obj['id']

            # Agregar etiqueta al email
            self.service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'addLabelIds': [label_id]}
            ).execute()
            return True
        except Exception as e:
            self._log(f"✗ Error agregando etiqueta: {e}")
            return False

    def classify_and_process(self, max_emails=15, action='none'):
        """
        Clasificar emails y realizar acciones

        action puede ser:
        - 'none': Solo clasificar y reportar
        - 'move': Mover spam a carpeta de spam
        - 'delete': Eliminar spam (CUIDADO!)
        - 'label': Etiquetar spam
        """
        self._log(f"📬 Procesando hasta {max_emails} emails (acción: {action})...")

        if not self.load_model():
            self._log("✗ No se pudo cargar el modelo")
            return []

        emails = self.get_emails(max_results=max_emails)
        results = []
        spam_count = 0
        ham_count = 0

        for idx, msg in enumerate(emails, 1):
            try:
                parsed = self.parse_email(msg['id'])
                if parsed:
                    classification = self.classify_email(parsed['full_text'])
                    if classification:
                        is_spam = classification['is_spam']
                        spam_count += is_spam
                        ham_count += not is_spam

                        result = {
                            'id': parsed['id'],
                            'subject': parsed['subject'],
                            'sender': parsed['sender'],
                            'date': parsed['date'],
                            'is_spam': is_spam,
                            'spam_probability': classification['spam_probability']
                        }
                        results.append(result)

                        status = "🚨 SPAM" if is_spam else "✓ HAM"
                        prob = classification['spam_probability'] * 100
                        self._log(f"[{idx}/{len(emails)}] {status} ({prob:.1f}%) - {parsed['subject'][:50]}")

                        # REALIZAR ACCIONES
                        if is_spam:
                            if action == 'move':
                                if self.move_to_spam(parsed['id']):
                                    self._log(f"  ↪ Movido a carpeta SPAM")
                            elif action == 'delete':
                                if self.delete_email(parsed['id']):
                                    self._log(f"  ↪ Enviado a papelera")
                            elif action == 'label':
                                if self.add_label(parsed['id'], 'ClassifiedSpam'):
                                    self._log(f"  ↪ Etiquetado como SPAM")

            except Exception as e:
                self._log(f"✗ Error procesando email {idx}: {e}")

        # Guardar resultados ORDENADOS
        self._save_results_ordenados(results, spam_count, ham_count)
        self._log(f"📊 Clasificación completada: {ham_count} HAM, {spam_count} SPAM")

        return results

    def _save_results_ordenados(self, results, spam_count, ham_count):
        """Guardar resultados ORDENADOS por probabilidad de spam"""
        try:
            # Ordenar por probabilidad de spam (de mayor a menor)
            results_ordenados = sorted(results, key=lambda x: x['spam_probability'], reverse=True)

            output = {
                'timestamp': datetime.now().isoformat(),
                'stats': {
                    'total': len(results),
                    'spam': spam_count,
                    'ham': ham_count,
                    'spam_percentage': round(spam_count / len(results) * 100, 2) if results else 0
                },
                'emails_ordenados_por_spam': results_ordenados
            }

            with open('classification_results.json', 'w') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)

            self._log(f"✓ Resultados guardados (ordenados por spam probability)")
        except Exception as e:
            self._log(f"✗ Error guardando resultados: {e}")

    def generar_reporte_agrupado(self):
        """Generar reporte agrupado por remitente"""
        try:
            with open('classification_results.json', 'r') as f:
                data = json.load(f)

            # Agrupar por remitente
            agrupado = defaultdict(list)
            for email in data['emails_ordenados_por_spam']:
                sender = email['sender']
                agrupado[sender].append(email)

            # Crear reporte
            reporte = {
                'timestamp': datetime.now().isoformat(),
                'resumen_general': data['stats'],
                'emails_por_remitente': {}
            }

            for sender, emails in sorted(agrupado.items()):
                spam_en_sender = sum(1 for e in emails if e['is_spam'])
                reporte['emails_por_remitente'][sender] = {
                    'total': len(emails),
                    'spam': spam_en_sender,
                    'ham': len(emails) - spam_en_sender,
                    'emails': emails
                }

            with open('reporte_agrupado.json', 'w') as f:
                json.dump(reporte, f, indent=2, ensure_ascii=False)

            self._log("✓ Reporte agrupado generado: reporte_agrupado.json")
            return reporte
        except Exception as e:
            self._log(f"✗ Error generando reporte: {e}")
            return None


def main():
    """Función principal"""
    import sys

    classifier = GmailClassifierAvanzado()

    if not os.path.exists('email_classifier_model.pkl'):
        print("\n🔄 Primera ejecución: entrenando modelo...")
        classifier.train_model()

    # Mostrar opciones
    print("\n" + "="*60)
    print("📧 OPCIONES DE PROCESAMIENTO")
    print("="*60)
    print("1. Solo clasificar (sin acciones)")
    print("2. Mover SPAM a carpeta de spam")
    print("3. Eliminar SPAM (⚠️  CUIDADO)")
    print("4. Etiquetar SPAM")
    print("="*60)

    opcion = input("\nSelecciona opción (1-4): ").strip()

    accion_map = {
        '1': 'none',
        '2': 'move',
        '3': 'delete',
        '4': 'label'
    }

    accion = accion_map.get(opcion, 'none')

    if accion == 'delete':
        confirmacion = input("\n⚠️  ADVERTENCIA: ¿Realmente quieres ELIMINAR emails SPAM? (s/n): ").strip().lower()
        if confirmacion != 's':
            print("Cancelado. Usando modo 'none'")
            accion = 'none'

    # Ejecutar
    classifier.classify_and_process(max_emails=15, action=accion)

    # Generar reportes
    print("\n📊 Generando reportes...")
    classifier.generar_reporte_agrupado()

    # Mostrar resumen
    try:
        with open('classification_results.json', 'r') as f:
            data = json.load(f)
        summary = data['stats']

        print("\n" + "="*60)
        print("📊 RESUMEN DE CLASIFICACIÓN")
        print("="*60)
        print(f"Total: {summary['total']}")
        print(f"Spam: {summary['spam']} ({summary['spam_percentage']}%)")
        print(f"Legítimos: {summary['ham']}")
        print("="*60)
        print("\n✓ Archivos generados:")
        print("  - classification_results.json (ordenado por spam)")
        print("  - reporte_agrupado.json (agrupado por remitente)")
        print("  - classifier.log (eventos detallados)")
    except:
        pass


if __name__ == '__main__':
    main()
