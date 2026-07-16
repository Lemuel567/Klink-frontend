import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScrollReveal } from '../../src/components/animations/ScrollReveal';
import { KlinkCard } from '../../src/components/common/KlinkCard';
import { KlinkInput } from '../../src/components/common/KlinkInput';
import { KlinkButton } from '../../src/components/common/KlinkButton';
import { MemberCardSkeleton } from '../../src/components/common/KlinkSkeleton';
import { EmptyState } from '../../src/components/common/EmptyState';
import { confirmDelete } from '../../src/utils/confirmDelete';
import { churchFilesApi, ChurchFile } from '../../src/api/churchFiles';
import { Colors, Gradients } from '../../src/theme/colors';
import { FontSize, FontWeight, LetterSpacing } from '../../src/theme/typography';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { useTheme } from '../../src/hooks/useTheme';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useRole } from '../../src/store/authStore';
import { formatRelativeTime } from '../../src/utils/formatters';
import { StaggerDelay } from '../../src/theme/animations';
import { PAGE_SIZE } from '../../src/utils/constants';

// Backend: upload/delete = Pastor, Elder, Manager; PDF only, max 30MB, max 10 per church
const CAN_MANAGE = ['PASTOR', 'ELDER', 'MANAGER'];

export default function ChurchFilesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const role = useRole();
  const queryClient = useQueryClient();

  const canManage = role ? CAN_MANAGE.includes(role) : false;

  const [composing, setComposing] = useState(false);
  const [pdf, setPdf] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['church-files'],
    queryFn: ({ pageParam = 0 }) => churchFilesApi.getAll({ page: pageParam, size: PAGE_SIZE }),
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    initialPageParam: 0,
  });

  const files: ChurchFile[] = query.data?.pages.flatMap((p) => p.content) ?? [];

  const pickPdf = async () => {
    haptics.light();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPdf({ uri: asset.uri, name: asset.name ?? 'document.pdf', type: 'application/pdf' });
      if (!title.trim() && asset.name) {
        setTitle(asset.name.replace(/\.pdf$/i, ''));
      }
    } catch {
      Alert.alert('Error', 'Could not open the file picker.');
    }
  };

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: () =>
      churchFilesApi.upload({
        file: pdf!,
        title: title.trim(),
        category: category.trim(),
        language: language.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['church-files'] });
      haptics.success();
      setComposing(false);
      setPdf(null);
      setTitle('');
      setCategory('');
      setLanguage('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not upload the file.');
      haptics.error();
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => churchFilesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['church-files'] });
      haptics.success();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.friendlyMessage ?? 'Could not delete the file.');
      haptics.error();
    },
  });

  const openFile = async (file: ChurchFile) => {
    haptics.light();
    try {
      await WebBrowser.openBrowserAsync(file.fileUrl);
    } catch {
      Alert.alert('Error', 'Could not open the document.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={Gradients.darkWorship} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Church Files</Text>
        <Text style={styles.headerSub}>Documents, forms and resources</Text>
      </LinearGradient>

      {query.isLoading ? (
        <View style={{ paddingTop: Spacing.md }}>
          {Array.from({ length: 5 }, (_, i) => <MemberCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlashList
          data={files}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ScrollReveal delay={index * StaggerDelay.list} style={styles.cardWrap}>
              <KlinkCard onPress={() => openFile(item)} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.pdfIcon}>
                    <Text style={styles.pdfEmoji}>📄</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.fileTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.fileMeta, { color: theme.textMuted }]} numberOfLines={1}>
                      {item.category}
                      {item.language ? ` · ${item.language}` : ''}
                      {' · '}
                      {formatRelativeTime(item.uploadedAt)}
                    </Text>
                  </View>
                  {canManage && (
                    <TouchableOpacity
                      onPress={() =>
                        confirmDelete({
                          title: `Delete ${item.title}?`,
                          message: 'The document will be removed for everyone.',
                          onConfirm: () => remove(item.id),
                        })
                      }
                      style={styles.deleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.title}`}
                    >
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </KlinkCard>
            </ScrollReveal>
          )}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={Colors.gold} />
          }
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: canManage ? 120 : 100 }}
          ListEmptyComponent={
            <EmptyState
              icon="📄"
              title="No files yet"
              subtitle={
                canManage
                  ? 'Upload constitutions, hymn sheets, forms — up to 10 PDFs.'
                  : 'Church documents will appear here.'
              }
              actionLabel={canManage ? '+ Upload PDF' : undefined}
              onAction={canManage ? () => setComposing(true) : undefined}
            />
          }
        />
      )}

      {/* Upload FAB — Pastor / Elder / Manager */}
      {canManage && (
        <View style={[styles.fabContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={() => { haptics.medium(); setComposing(true); }}
            style={styles.fab}
            accessibilityRole="button"
            accessibilityLabel="Upload a PDF"
          >
            <LinearGradient colors={Gradients.glory} style={styles.fabGradient}>
              <Text style={styles.fabText}>+ Upload PDF</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Upload modal */}
      <Modal visible={composing} transparent animationType="fade" onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.modalGlass]} />
            <Text style={styles.modalTitle}>Upload document</Text>
            <Text style={styles.modalSub}>PDF only · max 30 MB · up to 10 files per church</Text>

            <TouchableOpacity
              onPress={pickPdf}
              style={styles.pdfPicker}
              accessibilityRole="button"
              accessibilityLabel="Choose a PDF"
            >
              <Text style={styles.pdfPickerIcon}>{pdf ? '📄' : '📎'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pdfPickerTitle} numberOfLines={1}>
                  {pdf ? pdf.name : 'Choose a PDF file'}
                </Text>
                <Text style={styles.pdfPickerSub}>{pdf ? 'Tap to replace' : 'From your device'}</Text>
              </View>
            </TouchableOpacity>

            <KlinkInput label="Title" value={title} onChangeText={setTitle} maxLength={200} />
            <KlinkInput
              label="Category (e.g. constitution, hymns)"
              value={category}
              onChangeText={setCategory}
              autoCapitalize="none"
              maxLength={100}
            />
            <KlinkInput
              label="Language (optional)"
              value={language}
              onChangeText={setLanguage}
              maxLength={50}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { haptics.light(); setComposing(false); }}
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <KlinkButton
                  label="Upload"
                  onPress={() => { if (pdf && title.trim() && category.trim()) upload(); }}
                  disabled={!pdf || !title.trim() || !category.trim() || uploading}
                  loading={uploading}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.pagePadding, paddingBottom: Spacing.lg, gap: 4 },
  backBtn: { alignSelf: 'flex-start', width: 44, height: 44, justifyContent: 'center' },
  backIcon: { color: Colors.white, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: Colors.white, fontSize: FontSize.h2, fontWeight: FontWeight.bold, letterSpacing: LetterSpacing.tight },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.small },
  cardWrap: { marginHorizontal: Spacing.pagePadding, marginBottom: Spacing.sm },
  card: {},
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pdfIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(220,38,38,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfEmoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  fileTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semiBold },
  fileMeta: { fontSize: FontSize.caption, marginTop: 2, textTransform: 'capitalize' },
  deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: Colors.red, fontSize: 15, fontWeight: FontWeight.bold },
  fabContainer: { position: 'absolute', right: Spacing.pagePadding, bottom: 0 },
  fab: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  fabGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.body },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.pagePadding,
  },
  modalCard: { borderRadius: BorderRadius.xxl, overflow: 'hidden', padding: Spacing.lg, gap: Spacing.md },
  modalGlass: {
    borderRadius: BorderRadius.xxl,
    backgroundColor: 'rgba(26,31,62,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalTitle: { color: Colors.white, fontSize: FontSize.h4, fontWeight: FontWeight.bold },
  modalSub: { color: 'rgba(255,255,255,0.55)', fontSize: FontSize.caption },
  pdfPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(244,164,41,0.35)',
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 64,
  },
  pdfPickerIcon: { fontSize: 24 },
  pdfPickerTitle: { color: Colors.white, fontSize: FontSize.small, fontWeight: FontWeight.semiBold },
  pdfPickerSub: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.caption, marginTop: 1 },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalCancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  modalCancelText: { color: Colors.darkMuted, fontSize: FontSize.body, fontWeight: FontWeight.medium },
});
