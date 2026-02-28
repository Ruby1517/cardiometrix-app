import type React from 'react';
import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { useAuthStore } from '../store/auth';
import { fetchCareMessages, fetchCareNotes, fetchCareTasks, sendCareMessage } from '../api/careTeam';
import { CareMessage, CareNote, CareTask } from '../api/careTeam';
import { theme } from '../theme';

export function CareTeamScreen() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<CareNote[]>([]);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.id) return;
      try {
        const [notesRes, tasksRes, messagesRes] = await Promise.all([
          fetchCareNotes(user.id),
          fetchCareTasks(user.id),
          fetchCareMessages(user.id),
        ]);
        if (!active) return;
        setNotes(notesRes);
        setTasks(tasksRes);
        setMessages(messagesRes);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function onSend() {
    if (!user?.id || !messageBody.trim()) return;
    setSending(true);
    try {
      await sendCareMessage(user.id, messageBody.trim());
      setMessageBody('');
      const updated = await fetchCareMessages(user.id);
      setMessages(updated);
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Care Team</Text>
        <Text style={styles.subtitle}>Notes, tasks, and messages from your clinician.</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {loading ? (
            <Text style={styles.helper}>Loading notes…</Text>
          ) : notes.length === 0 ? (
            <Text style={styles.helper}>No notes yet.</Text>
          ) : (
            notes.map((note) => (
              <View key={note.id} style={styles.item}>
                <Text style={styles.meta}>{new Date(note.createdAt).toLocaleString()}</Text>
                <Text style={styles.body}>{note.body}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          {loading ? (
            <Text style={styles.helper}>Loading tasks…</Text>
          ) : tasks.length === 0 ? (
            <Text style={styles.helper}>No tasks assigned.</Text>
          ) : (
            tasks.map((task) => (
              <View key={task.id} style={styles.item}>
                <View style={styles.taskHeader}>
                  <Text style={styles.body}>{task.title}</Text>
                  <Text style={styles.taskStatus}>{task.status}</Text>
                </View>
                {task.detail ? <Text style={styles.helper}>{task.detail}</Text> : null}
                {task.dueDate ? <Text style={styles.meta}>Due {task.dueDate}</Text> : null}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Messages</Text>
          <View style={styles.messageList}>
            {messages.length === 0 ? (
              <Text style={styles.helper}>No messages yet.</Text>
            ) : (
              messages.map((msg) => (
                <View key={msg.id} style={styles.messageItem}>
                  <Text style={styles.meta}>
                    {msg.authorRole} · {new Date(msg.createdAt).toLocaleString()}
                  </Text>
                  <Text style={styles.body}>{msg.body}</Text>
                </View>
              ))
            )}
          </View>
          <View style={styles.messageComposer}>
            <TextInput
              value={messageBody}
              onChangeText={setMessageBody}
              placeholder="Write a message..."
              style={styles.input}
              multiline
            />
            <View style={styles.primaryButton}>
              <Button title={sending ? 'Sending...' : 'Send'} onPress={onSend} disabled={sending} color="#ffffff" />
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.screen,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
    marginBottom: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.card,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  item: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 10,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: theme.colors.text,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  meta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskStatus: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    textTransform: 'uppercase',
  },
  messageList: {
    maxHeight: 240,
    marginBottom: 10,
  },
  messageItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 10,
    marginBottom: 8,
  },
  messageComposer: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    minHeight: 60,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
});
