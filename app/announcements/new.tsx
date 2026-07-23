import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PhotoHeader } from "../../src/components/common/PhotoHeader";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  announcementsApi,
  AnnouncementTargetType,
  ChurchRole,
  GroupSummary,
  targetTypeLabel,
  targetTypeColor,
} from '../../src/api/announcements';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { TypewriterText } from '../../src/components/animations/TypewriterText';
import { AIPolish } from '../../src/components/common/AIPolish';

const TARGET_TYPES: AnnouncementTargetType[] = ['ALL', 'ROLES', 'GROUPS', 'MEMBERS', 'CUSTOM'];

const ALL_ROLES: ChurchRole[] = [
  'PASTOR',
  'ELDER',
  'MANAGER',
  'FINANCIAL_SECRETARY',
  'GROUP_ADMIN',
  'GROUP_FINANCIAL_SECRETARY',
  'MEMBER',
];

const ROLE_LABELS: Record<ChurchRole, string> = {
  PASTOR: 'Pastor',
  ELDER: 'Elder',
  MANAGER: 'Manager',
  FINANCIAL_SECRETARY: 'Financial Secretary',
  GROUP_ADMIN: 'Group Admin',
  GROUP_FINANCIAL_SECRETARY: 'Group Fin. Sec.',
  MEMBER: 'Member',
};

export default function NewAnnouncementScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<AnnouncementTargetType>('ALL');
  const [selectedRoles, setSelectedRoles] = useState<ChurchRole[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const { data: groupsData, isLoading: loadingGroups } = useQuery<GroupSummary[]>({
    queryKey: ['announcement-groups'],
    queryFn: announcementsApi.groups,
  });
  const groups: GroupSummary[] = groupsData ?? [];

  const createMutation = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements-all'] });
      queryClient.invalidateQueries({ queryKey: ['announcements-my'] });
      haptics.success();
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Failed to post announcement');
    },
  });

  const toggleRole = (role: ChurchRole) => {
    haptics.light();
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleGroup = (id: string) => {
    haptics.light();
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const canSubmit = () => {
    if (!title.trim() || !body.trim()) return false;
    if (targetType === 'ROLES' && selectedRoles.length === 0) return false;
    if (targetType === 'GROUPS' && selectedGroupIds.length === 0) return false;
    if (targetType === 'CUSTOM' && selectedRoles.length === 0 && selectedGroupIds.length === 0) return false;
    return true;
  };

  const handleSubmit = () => {
    if (!canSubmit()) return;
    haptics.medium();
    createMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      targetType,
      targetRoles: ['ROLES', 'CUSTOM'].includes(targetType) ? selectedRoles : undefined,
      targetGroupIds: ['GROUPS', 'CUSTOM'].includes(targetType) ? selectedGroupIds : undefined,
    });
  };

  const showRoles = targetType === 'ROLES' || targetType === 'CUSTOM';
  const showGroups = targetType === 'GROUPS' || targetType === 'CUSTOM';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PhotoHeader style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => { haptics.light(); router.back(); }}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
         
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <TypewriterText text="New Announcement" style={styles.headerTitle} charDelayMs={42} />
          <View style={{ width: 60 }} />
        </View>
      </PhotoHeader>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Announcement title"
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              returnKeyType="next"
              accessibilityLabel="Announcement title"
            />
          </View>

          {/* Body */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textarea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Write your announcement…"
              placeholderTextColor={theme.textMuted}
              value={body}
              onChangeText={setBody}
              maxLength={5000}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Announcement message"
            />
            <AIPolish
              text={body}
              onResult={setBody}
              contentType="a church announcement (clear and inviting)"
              style={{ marginTop: 8 }}
            />
          </View>

          {/* Target type */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>Send to</Text>
            <View style={styles.chips}>
              {TARGET_TYPES.map((t) => {
                const active = targetType === t;
                const color = targetTypeColor(t);
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => { haptics.light(); setTargetType(t); }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? color : 'transparent',
                        borderColor: color,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, { color: active ? Colors.white : color }]}>
                      {targetTypeLabel(t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Role multi-select */}
          {showRoles && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                Select Roles {targetType === 'ROLES' ? '*' : ''}
              </Text>
              <View style={styles.chips}>
                {ALL_ROLES.map((role) => {
                  const active = selectedRoles.includes(role);
                  return (
                    <TouchableOpacity
                      key={role}
                      onPress={() => toggleRole(role)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? Colors.purple : 'transparent',
                          borderColor: Colors.purple,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, { color: active ? Colors.white : Colors.purple }]}>
                        {ROLE_LABELS[role]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Group multi-select */}
          {showGroups && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                Select Groups {targetType === 'GROUPS' ? '*' : ''}
              </Text>
              {loadingGroups ? (
                <ActivityIndicator color={Colors.gold} />
              ) : groups.length === 0 ? (
                <Text style={[styles.emptyNote, { color: theme.textMuted }]}>No active groups found</Text>
              ) : (
                <View style={styles.chips}>
                  {groups.map((g) => {
                    const active = selectedGroupIds.includes(g.id);
                    return (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => toggleGroup(g.id)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? Colors.blue : 'transparent',
                            borderColor: Colors.blue,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.chipText, { color: active ? Colors.white : Colors.blue }]}>
                          {g.groupName} ({g.memberCount})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit() || createMutation.isPending}
            style={[
              styles.submitBtn,
              { opacity: canSubmit() && !createMutation.isPending ? 1 : 0.5 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Post announcement"
          >
            <LinearGradient colors={Gradients.glory} style={styles.submitGradient}>
              {createMutation.isPending ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitText}>Post Announcement</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 8, minWidth: 60 },
  backText: { color: Colors.white, fontSize: FontSize.small },
  headerTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  content: { padding: Spacing.pagePadding, gap: Spacing.lg },
  field: { gap: Spacing.sm },
  label: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.body,
    minHeight: 48,
  },
  textarea: { minHeight: 140, paddingTop: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: { fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  emptyNote: { fontSize: FontSize.small, fontStyle: 'italic' },
  submitBtn: { marginTop: Spacing.md, borderRadius: BorderRadius.full, overflow: 'hidden' },
  submitGradient: { paddingVertical: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.full },
  submitText: { color: Colors.white, fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
