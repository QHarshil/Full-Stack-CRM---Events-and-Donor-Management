import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { Users, Calendar, TrendingUp, Target, LogOut, Search, Filter, Plus, Edit, Trash2, CheckCircle } from 'lucide-react'
import DonorSuggestionList from '@/features/donors/components/DonorSuggestionList.jsx'
import DonorList from '@/features/donors/components/DonorList.jsx'
import EventDetailView from '@/features/events/components/EventDetailView.jsx'
import { formatCurrency, formatDate } from '@/lib/formatters.js'
import { EVENT_STATUS_BADGE_VARIANT } from '@/features/events/constants.js'
import { getAuditActionLabel } from '@/features/audit/auditUtils.ts'
import { DonationTrendCard } from '@/features/analytics/components/DonationTrendCard.jsx'
import { EngagementBreakdownCard } from '@/features/analytics/components/EngagementBreakdownCard.jsx'
import { SegmentPerformanceCard } from '@/features/analytics/components/SegmentPerformanceCard.jsx'
import { CityPerformanceCard } from '@/features/analytics/components/CityPerformanceCard.jsx'
import './App.css'

const API_URL = 'http://localhost:3001'

const CANCER_TYPES = [
  'Breast Cancer',
  'Lung Cancer',
  'Prostate Cancer',
  'Colorectal Cancer',
  'Skin Cancer',
  'Leukemia',
  'Lymphoma',
  'Brain Cancer',
]

const BC_CITIES = [
  'Vancouver',
  'Victoria',
  'Kelowna',
  'Kamloops',
  'Nanaimo',
  'Prince George',
  'Abbotsford',
  'Surrey',
]

const DONOR_SORT_OPTIONS = [
  { value: 'totalDonations-desc', label: 'Total Donations (High to Low)' },
  { value: 'lastGiftDate-desc', label: 'Last Gift Date (Newest First)' },
  { value: 'lastGiftAmount-desc', label: 'Last Gift Amount (High to Low)' },
  { value: 'alphabetical-asc', label: 'Name (A-Z)' },
]

const DONOR_PAGE_SIZE = 50

const AUDIT_PAGE_SIZE = 20

const AUDIT_ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'baseline', label: 'Baseline' },
]

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [analytics, setAnalytics] = useState(null)
  const [donors, setDonors] = useState([])
  const [events, setEvents] = useState([])
  const [matchResults, setMatchResults] = useState(null)
  const [searchTermInput, setSearchTermInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeDonorId, setActiveDonorId] = useState(null)
  const [isDonorListLoading, setIsDonorListLoading] = useState(false)
  const [isDonorLoadingMore, setIsDonorLoadingMore] = useState(false)
  const [donorPage, setDonorPage] = useState(1)
  const [donorHasMore, setDonorHasMore] = useState(true)
  const [donorTotal, setDonorTotal] = useState(0)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedEventForMatching, setSelectedEventForMatching] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [selectedEventDetail, setSelectedEventDetail] = useState(null)
  const [isEventDetailLoading, setIsEventDetailLoading] = useState(false)
  const [adminUsers, setAdminUsers] = useState([])
  const [isAdminLoading, setIsAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState(null)
  const [donorSortOption, setDonorSortOption] = useState('totalDonations-desc')
  const [donorCityFilter, setDonorCityFilter] = useState('all')
  const [donorInterestFilter, setDonorInterestFilter] = useState('all')
  const [availableCities, setAvailableCities] = useState([])
  const [availableInterests, setAvailableInterests] = useState([])
  const [donorInviteSelections, setDonorInviteSelections] = useState({})
  const [matchInviteCount, setMatchInviteCount] = useState(20)
  const [auditLogs, setAuditLogs] = useState([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditTotalCount, setAuditTotalCount] = useState(0)
  const [isAuditLoading, setIsAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState(null)
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [auditEntityFilter, setAuditEntityFilter] = useState('')
  const [selectedAuditLog, setSelectedAuditLog] = useState(null)
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const [isAuditExporting, setIsAuditExporting] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm(searchTermInput.trim())
    }, 300)

    return () => clearTimeout(handle)
  }, [searchTermInput])

  useEffect(() => {
    setActiveDonorId(null)
  }, [searchTerm])

  useEffect(() => {
    setActiveDonorId(null)
  }, [donorCityFilter, donorInterestFilter, donorSortOption])

  const maximumInviteCount = useMemo(() => {
    const expected = selectedEventForMatching?.expectedAttendees
    if (expected && expected > 0) {
      return expected
    }

    const matchesCount = matchResults?.matches?.length || 0
    if (matchesCount > 0) {
      return matchesCount
    }

    return 1
  }, [selectedEventForMatching, matchResults])

  useEffect(() => {
    if (!selectedEventForMatching && !matchResults) {
      return
    }

    setMatchInviteCount((current) => {
      const fallback = Math.min(20, maximumInviteCount) || 1
      if (!current || current <= 0) {
        return fallback
      }
      const next = Math.min(current, maximumInviteCount)
      return next || fallback
    })
  }, [maximumInviteCount, matchResults, selectedEventForMatching])

  useEffect(() => {
    if (!selectedEventId || currentPage !== 'event-detail') {
      return
    }

    const controller = new AbortController()

    const fetchEventDetail = async () => {
      setIsEventDetailLoading(true)
      try {
        const res = await fetch(`${API_URL}/events/${selectedEventId}`, {
          credentials: 'include',
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          setSelectedEventDetail(data)
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to load event detail:', error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsEventDetailLoading(false)
        }
      }
    }

    fetchEventDetail()

    return () => controller.abort()
  }, [selectedEventId, currentPage])

  useEffect(() => {
    if (currentPage === 'admin' && user?.role === 'admin') {
      fetchAdminUsers()
    }
  }, [currentPage, user])

  useEffect(() => {
    if (currentPage !== 'donors' || !user) {
      return
    }
    if (availableCities.length === 0 || availableInterests.length === 0) {
      fetchDonorFilters()
    }
  }, [currentPage, user, availableCities.length, availableInterests.length])

  useEffect(() => {
    if (currentPage !== 'donors' || !user) {
      return
    }
    setDonorInviteSelections({})
    fetchDonorsPage({ page: 1, append: false })
  }, [currentPage, user, donorSortOption, donorCityFilter, donorInterestFilter, searchTerm])

  useEffect(() => {
    if (currentPage !== 'audit' || user?.role !== 'admin') {
      return
    }
    setAuditPage(1)
    fetchAuditLogs(1)
  }, [auditActionFilter, auditEntityFilter, currentPage, user])

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/whoami`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        loadDashboardData()
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.target)
    const username = formData.get('username')
    const password = formData.get('password')

    try {
      const res = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data)
        loadDashboardData()
      } else {
        alert('Invalid credentials')
      }
    } catch (error) {
      alert('Login failed: ' + error.message)
    }
  }

  const handleLogout = async () => {
    await fetch(`${API_URL}/auth/signout`, { method: 'POST', credentials: 'include' })
    setUser(null)
    setDonors([])
    setDonorPage(1)
    setDonorHasMore(true)
    setDonorTotal(0)
    setAvailableCities([])
    setAvailableInterests([])
    setDonorInviteSelections({})
    setAuditLogs([])
    setAuditPage(1)
    setAuditTotalPages(1)
    setAuditTotalCount(0)
    setCurrentPage('dashboard')
  }

  const loadDashboardData = async () => {
    try {
      const [analyticsRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/analytics/summary`, { credentials: 'include' }),
        fetch(`${API_URL}/events`, { credentials: 'include' }),
      ])

      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json())
      }

      if (eventsRes.ok) {
        setEvents(await eventsRes.json())
      }
    } catch (error) {
      console.error('Failed to load core dashboard data:', error)
    }
  }

  const handleCreateEvent = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.target)

    const eventData = {
      name: formData.get('name'),
      description: formData.get('description'),
      date: new Date(formData.get('date')).toISOString(),
      location: formData.get('location'),
      eventType: formData
        .get('eventType')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      targetAmount: parseFloat(formData.get('targetAmount')),
      expectedAttendees: parseInt(formData.get('expectedAttendees'), 10),
      status: formData.get('status') || 'planned',
      notes: formData.get('notes')?.trim() || null,
    }

    try {
      const url = editingEvent ? `${API_URL}/events/${editingEvent.id}` : `${API_URL}/events`

      const res = await fetch(url, {
        method: editingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData),
      })

      if (res.ok) {
        const savedEvent = await res.json()
        setShowEventDialog(false)
        setEditingEvent(null)

        const eventsResponse = await fetch(`${API_URL}/events`, { credentials: 'include' })
        if (eventsResponse.ok) {
          setEvents(await eventsResponse.json())
        }

        alert(editingEvent ? 'Event updated successfully!' : 'Event created successfully!')

        if (!editingEvent && confirm('Would you like to find matching donors for this event?')) {
          handleEventMatching(savedEvent)
        }
      }
    } catch (error) {
      alert('Failed to save event: ' + error.message)
    }
  }

  const handleEventMatching = async (event) => {
    const criteria = {
      eventType: event.eventType,
      location: event.location,
      targetAttendees: event.expectedAttendees,
      eventFocus: 'fundraising',
    }

    try {
      const res = await fetch(`${API_URL}/donors/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(criteria),
      })

      if (res.ok) {
        const data = await res.json()
        setMatchResults(data)
        setSelectedEventForMatching(event)
        setCurrentPage('matching')
      }
    } catch (error) {
      alert('Matching failed: ' + error.message)
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const res = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        setEvents(events.filter((event) => event.id !== eventId))
        alert('Event deleted successfully')

        if (selectedEventId === eventId) {
          handleBackToEvents()
        }
      }
    } catch (error) {
      alert('Failed to delete event: ' + error.message)
    }
  }

  const handleAddDonorsToEvent = async (
    eventId,
    donorIds,
    matchScores,
    options = {},
  ) => {
    const {
      redirectToEvents = true,
      resetMatching = true,
      showMessage = true,
      successMessage,
    } = options

    if (!Array.isArray(donorIds) || donorIds.length === 0) {
      if (showMessage) {
        alert('No donors selected for invitation.')
      }
      return false
    }

    const sanitizedDonorIds = donorIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)

    if (sanitizedDonorIds.length === 0) {
      if (showMessage) {
        alert('No valid donors selected for invitation.')
      }
      return false
    }

    const normalizedMatchScores = matchScores || {}

    try {
      const res = await fetch(`${API_URL}/events/${eventId}/donors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ donorIds: sanitizedDonorIds, matchScores: normalizedMatchScores }),
      })

      if (!res.ok) {
        const message = await res.text()
        if (showMessage) {
          alert(message || 'Failed to add donors to the event.')
        }
        return false
      }

      const result = await res.json()

      if (showMessage) {
        alert(successMessage || `Successfully added ${result.count} donors to the event!`)
      }

      if (resetMatching) {
        setMatchResults(null)
        setSelectedEventForMatching(null)
      }

      if (redirectToEvents) {
        setCurrentPage('events')
      }

      try {
        const updatedEventResponse = await fetch(`${API_URL}/events/${eventId}`, {
          credentials: 'include',
        })
        if (updatedEventResponse.ok) {
          const updatedEvent = await updatedEventResponse.json()
          setEvents((prevEvents) =>
            prevEvents.map((eventItem) => (eventItem.id === eventId ? updatedEvent : eventItem)),
          )
          if (selectedEventId === eventId) {
            setSelectedEventDetail(updatedEvent)
          }
        }
      } catch (refreshError) {
        console.error('Failed to refresh event data after inviting donors:', refreshError)
      }

      return true
    } catch (error) {
      if (showMessage) {
        alert('Failed to add donors: ' + error.message)
      }
      return false
    }
  }

  const handleDonorInviteSelection = (donorId, eventId) => {
    setDonorInviteSelections((previous) => ({
      ...previous,
      [donorId]: eventId,
    }))
  }

  const handleInviteDonorToEvent = async (donorId) => {
    const selectedEventIdForDonor = donorInviteSelections[donorId]

    if (!selectedEventIdForDonor) {
      alert('Please select an event before inviting this donor.')
      return
    }

    const inviteSucceeded = await handleAddDonorsToEvent(
      Number(selectedEventIdForDonor),
      [donorId],
      {},
      {
        redirectToEvents: false,
        resetMatching: false,
        successMessage: 'Donor invited to the event.',
      },
    )

    if (inviteSucceeded) {
      setDonorInviteSelections((previous) => ({
        ...previous,
        [donorId]: '',
      }))
    }
  }

  const handleViewEventDetails = (event) => {
    setSelectedEventId(event.id)
    setSelectedEventDetail(event)
    setCurrentPage('event-detail')
  }

  const handleBackToEvents = () => {
    setCurrentPage('events')
    setSelectedEventId(null)
    setSelectedEventDetail(null)
  }

  const handleRemoveDonorFromEvent = async (eventId, donorId) => {
    if (!confirm('Remove this donor from the event?')) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/events/${eventId}/donors/${donorId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const message = await res.text()
        alert(message || 'Failed to remove donor from the event.')
        return
      }

      try {
        const updatedEventResponse = await fetch(`${API_URL}/events/${eventId}`, {
          credentials: 'include',
        })
        if (updatedEventResponse.ok) {
          const updatedEvent = await updatedEventResponse.json()
          setEvents((previousEvents) =>
            previousEvents.map((eventItem) => (eventItem.id === eventId ? updatedEvent : eventItem)),
          )
          if (selectedEventId === eventId) {
            setSelectedEventDetail(updatedEvent)
          }
        } else {
          // Fallback: manually update state if refresh fails
          setEvents((previousEvents) =>
            previousEvents.map((eventItem) =>
              eventItem.id === eventId
                ? {
                    ...eventItem,
                    eventDonors: (eventItem.eventDonors || []).filter(
                      (relation) => relation.donorId !== donorId,
                    ),
                  }
                : eventItem,
            ),
          )
          setSelectedEventDetail((previousDetail) => {
            if (!previousDetail || previousDetail.id !== eventId) {
              return previousDetail
            }
            return {
              ...previousDetail,
              eventDonors: (previousDetail.eventDonors || []).filter(
                (relation) => relation.donorId !== donorId,
              ),
            }
          })
        }
      } catch (refreshError) {
        console.error('Failed to refresh event after removing donor:', refreshError)
      }

      alert('Donor removed from the event.')
    } catch (error) {
      alert('Failed to remove donor: ' + error.message)
    }
  }

  const fetchAdminUsers = async () => {
    setIsAdminLoading(true)
    setAdminError(null)
    try {
      const res = await fetch(`${API_URL}/admin/users`, { credentials: 'include' })
      if (!res.ok) {
        throw new Error('Failed to load users')
      }
      const data = await res.json()
      setAdminUsers(data)
    } catch (error) {
      setAdminError(error.message)
    } finally {
      setIsAdminLoading(false)
    }
  }

  const fetchDonorFilters = async () => {
    try {
      const res = await fetch(`${API_URL}/donors/filters/options`, { credentials: 'include' })
      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      setAvailableCities((previous) => {
        const next = new Set(previous)
        ;(data.cities || []).forEach((city) => next.add(city))
        return Array.from(next).sort((a, b) => a.localeCompare(b))
      })
      setAvailableInterests((previous) => {
        const next = new Set(previous)
        ;(data.interests || []).forEach((interest) => next.add(interest))
        return Array.from(next).sort((a, b) => a.localeCompare(b))
      })
    } catch (error) {
      console.error('Failed to load donor filters:', error)
    }
  }

  const fetchDonorsPage = async ({ page = 1, append = false } = {}) => {
    if (append) {
      setIsDonorLoadingMore(true)
    } else {
      setIsDonorListLoading(true)
      setDonors([])
      setDonorPage(1)
      setDonorHasMore(true)
      setActiveDonorId(null)
    }

    try {
      const params = new URLSearchParams()
      params.set('limit', String(DONOR_PAGE_SIZE))
      params.set('page', String(page))
      params.set('sort', donorSortOption)

      if (searchTerm) {
        params.set('search', searchTerm)
      }

      if (donorCityFilter !== 'all') {
        params.set('city', donorCityFilter)
      }

      if (donorInterestFilter !== 'all') {
        params.set('interest', donorInterestFilter)
      }

      const res = await fetch(`${API_URL}/donors?${params.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Failed to load donors')
      }

      const data = await res.json()
      const incomingDonors = data.donors || []

      const mergeOptionsFromDonors = (list) => {
        setAvailableCities((previous) => {
          const next = new Set(previous)
          list.forEach((donor) => {
            if (donor?.city) {
              next.add(donor.city)
            }
          })
          return Array.from(next).sort((a, b) => a.localeCompare(b))
        })

        setAvailableInterests((previous) => {
          const next = new Set(previous)
          list.forEach((donor) => {
            if (Array.isArray(donor?.interests)) {
              donor.interests
                .filter(Boolean)
                .map((interest) => interest.trim())
                .forEach((interest) => {
                  if (interest) {
                    next.add(interest)
                  }
                })
            }
          })
          return Array.from(next).sort((a, b) => a.localeCompare(b))
        })
      }

      mergeOptionsFromDonors(incomingDonors)

      setDonorTotal(data.total || incomingDonors.length)
      setDonorHasMore(page < (data.totalPages || 1))
      setDonorPage(data.page || page)
      setDonors((previous) => {
        if (!append) {
          return incomingDonors
        }

        const existingIds = new Set(previous.map((donor) => donor.id))
        const merged = [...previous]
        incomingDonors.forEach((donor) => {
          if (!existingIds.has(donor.id)) {
            merged.push(donor)
          }
        })
        return merged
      })
    } catch (error) {
      console.error('Failed to load donors:', error)
      if (!append) {
        setDonors([])
        setDonorHasMore(false)
      }
    } finally {
      if (append) {
        setIsDonorLoadingMore(false)
      } else {
        setIsDonorListLoading(false)
      }
    }
  }

  const handleLoadMoreDonors = () => {
    if (!donorHasMore || isDonorLoadingMore || isDonorListLoading) {
      return
    }

    fetchDonorsPage({ page: donorPage + 1, append: true })
  }

  const fetchAuditLogs = async (page = 1) => {
    setIsAuditLoading(true)
    setAuditError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(AUDIT_PAGE_SIZE))

      if (auditActionFilter !== 'all') {
        params.set('action', auditActionFilter)
      }

      if (auditEntityFilter.trim()) {
        params.set('entityType', auditEntityFilter.trim())
      }

      const res = await fetch(`${API_URL}/admin/audit-logs?${params.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Failed to load audit logs')
      }

      const data = await res.json()
      setAuditLogs(data.items || [])
      setAuditPage(data.page || 1)
      setAuditTotalPages(Math.max(1, data.totalPages || 1))
      setAuditTotalCount(data.total || 0)
      setSelectedAuditLog(null)
      setAuditDialogOpen(false)
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      setAuditError(error.message || 'Failed to load audit logs')
    } finally {
      setIsAuditLoading(false)
    }
  }

  const handleUpdateUserRole = async (userId, role) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      })

      if (!res.ok) {
        throw new Error('Failed to update role')
      }

      const updatedUser = await res.json()
      setAdminUsers((prev) =>
        prev.map((userRecord) => (userRecord.id === updatedUser.id ? updatedUser : userRecord)),
      )
    } catch (error) {
      alert(error.message)
    }
  }

  const handleUpdateUserStatus = async (userId, isActive) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Failed to update status')
      }

      const updatedUser = await res.json()
      setAdminUsers((prev) =>
        prev.map((userRecord) => (userRecord.id === updatedUser.id ? updatedUser : userRecord)),
      )
    } catch (error) {
      alert(error.message)
    }
  }

  const handleAuditActionFilterChange = (value) => {
    setAuditActionFilter(value)
  }

  const handleAuditEntityFilterChange = (event) => {
    setAuditEntityFilter(event.target.value)
  }

  const handleAuditResetFilters = () => {
    setAuditActionFilter('all')
    setAuditEntityFilter('')
  }

  const handleAuditPageChange = (direction) => {
    if (direction === 'previous' && auditPage <= 1) {
      return
    }
    if (direction === 'next' && auditPage >= auditTotalPages) {
      return
    }

    const nextPage = direction === 'next' ? auditPage + 1 : auditPage - 1
    fetchAuditLogs(nextPage)
  }

  const handleAuditExport = async (format) => {
    setIsAuditExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('format', format)

      if (auditActionFilter !== 'all') {
        params.set('action', auditActionFilter)
      }

      if (auditEntityFilter.trim()) {
        params.set('entityType', auditEntityFilter.trim())
      }

      const res = await fetch(`${API_URL}/admin/audit-logs/export?${params.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Failed to export audit logs')
      }

      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Failed to export audit logs:', error)
      alert(error.message || 'Failed to export audit logs')
    } finally {
      setIsAuditExporting(false)
    }
  }

  const handleOpenAuditDetail = (log) => {
    setSelectedAuditLog(log)
    setAuditDialogOpen(true)
  }

  const handleCloseAuditDetail = () => {
    setSelectedAuditLog(null)
    setAuditDialogOpen(false)
  }

  const trimmedSearchTerm = searchTerm

  const donorSuggestions = trimmedSearchTerm ? donors.slice(0, 8) : []

  const isAdmin = user?.role === 'admin'
  const canManageEvents = user && (user.role === 'admin' || user.role === 'manager')
  const auditRangeStart = auditLogs.length ? (auditPage - 1) * AUDIT_PAGE_SIZE + 1 : 0
  const auditRangeEnd = auditLogs.length ? auditRangeStart + auditLogs.length - 1 : 0
  const auditFiltersActive = auditActionFilter !== 'all' || auditEntityFilter.trim() !== ''

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">BC Cancer Foundation</CardTitle>
            <CardDescription className="text-center">Donor Management System</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" placeholder="Enter username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" placeholder="Enter password" required />
              </div>
              <Button type="submit" className="w-full">
                Sign In
              </Button>
              <div className="text-sm text-muted-foreground text-center mt-4">
                <p className="font-semibold mb-2">Demo Credentials:</p>
                <p>admin / password123</p>
                <p>manager / password123</p>
                <p>staff / password123</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">BC Cancer CRM</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentPage('donors')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === 'donors' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Donors
                </button>
                <button
                  onClick={handleBackToEvents}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === 'events' || currentPage === 'event-detail'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Events
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setCurrentPage('admin')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentPage === 'admin' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => setCurrentPage('audit')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentPage === 'audit' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Audit Trail
                    </button>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user.username}</p>
                <p className="text-gray-500 text-xs capitalize">{user.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' && analytics && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-gray-600">Overview of your donor management system</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card
                role="button"
                tabIndex={0}
                onClick={() => setCurrentPage('donors')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setCurrentPage('donors')
                  }
                }}
                className="transition cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Donors</CardTitle>
                  <Users className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalDonors.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">{analytics.activeDonors} active in last year</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Donations</CardTitle>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(analytics.totalDonations / 1000000).toFixed(2)}M
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg: ${analytics.averageDonation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Events</CardTitle>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalEvents}</div>
                  <p className="text-xs text-gray-500 mt-1">{analytics.upcomingEvents} upcoming</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Engagement</CardTitle>
                  <Target className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.engagementRate.toFixed(1)}%</div>
                  <p className="text-xs text-gray-500 mt-1">Subscribed donors</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <DonationTrendCard data={analytics?.donationTrend ?? []} />
              </div>
              <EngagementBreakdownCard breakdown={analytics?.engagementBreakdown} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <SegmentPerformanceCard
                segments={analytics?.donorSegments ?? []}
                totalDonors={analytics?.totalDonors ?? 0}
              />

              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Top Donors</CardTitle>
                  <CardDescription>Leading supporters ranked by lifetime giving.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(analytics?.topDonors ?? []).slice(0, 6).map(donor => (
                      <div key={donor.id} className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {donor.firstName} {donor.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {donor.city}, {donor.province}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(donor.totalDonations)}
                          </p>
                          <p>Largest gift {formatCurrency(donor.largestGift)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <CityPerformanceCard cities={(analytics?.topCities ?? []).slice(0, 6)} />
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Leading Causes & Interests</CardTitle>
                  <CardDescription>Top focus areas attracting supporters across the province.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(analytics?.topInterests ?? []).slice(0, 8).map((interest) => (
                      <div
                        key={interest.interest}
                        className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                      >
                        <span className="text-sm font-medium text-gray-900">{interest.interest}</span>
                        <span className="text-xs text-gray-500">{interest.count} engaged donors</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        )}

        {currentPage === 'audit' && isAdmin && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Audit Trail</h2>
              <p className="text-gray-600">
                Review security-sensitive activity with export-ready reports for compliance reviews.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Audit Activity</CardTitle>
                <CardDescription>
                  Filtered results can be exported as CSV or JSON for external archival.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="flex flex-col gap-2 sm:min-w-[180px]">
                        <Label className="text-xs font-semibold uppercase text-gray-500">Action</Label>
                        <Select value={auditActionFilter} onValueChange={handleAuditActionFilterChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {AUDIT_ACTION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2 sm:min-w-[220px]">
                        <Label
                          htmlFor="audit-entity-filter"
                          className="text-xs font-semibold uppercase text-gray-500"
                        >
                          Entity
                        </Label>
                        <Input
                          id="audit-entity-filter"
                          placeholder="e.g. user, event"
                          value={auditEntityFilter}
                          onChange={handleAuditEntityFilterChange}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAuditResetFilters}
                        disabled={!auditFiltersActive}
                      >
                        Reset Filters
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAuditExport('csv')}
                        disabled={isAuditExporting}
                      >
                        {isAuditExporting ? 'Exporting…' : 'Export CSV'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAuditExport('json')}
                        disabled={isAuditExporting}
                      >
                        {isAuditExporting ? 'Exporting…' : 'Export JSON'}
                      </Button>
                    </div>
                  </div>

                  {auditError && <div className="text-sm text-red-600">{auditError}</div>}

                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Entity
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Actor
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            IP Address
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {isAuditLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                              Loading audit logs...
                            </td>
                          </tr>
                        ) : auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                              No audit entries found for the selected filters.
                            </td>
                          </tr>
                        ) : (
                          auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {getAuditActionLabel(log.action)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="flex flex-col">
                                  <span className="capitalize font-medium">{log.entityType}</span>
                                  {log.entityId != null && (
                                    <span className="text-xs text-gray-500">ID: {log.entityId}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {log.userId != null ? `User #${log.userId}` : 'System'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{log.ipAddress || '—'}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenAuditDetail(log)}>
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500">
                    <span>
                      {auditLogs.length > 0
                        ? `Showing ${auditRangeStart}-${auditRangeEnd} of ${auditTotalCount} entries`
                        : `Showing 0 of ${auditTotalCount} entries`}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAuditPageChange('previous')}
                        disabled={auditPage <= 1 || isAuditLoading}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {auditPage} of {auditTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAuditPageChange('next')}
                        disabled={auditPage >= auditTotalPages || isAuditLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentPage === 'donors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Donors</h2>
                <p className="text-gray-600">Manage donors and coordinate event invitations</p>
              </div>
              <p className="text-sm text-gray-500 max-w-xs text-right">
                {canManageEvents
                  ? 'Run donor matching from any event or invite donors directly from this list.'
                  : 'Only managers and admins can invite donors to events.'}
              </p>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search donors..."
                      value={searchTermInput}
                      onChange={(e) => setSearchTermInput(e.target.value)}
                      className="pl-10"
                    />
                    <DonorSuggestionList
                      suggestions={donorSuggestions}
                      searchTerm={trimmedSearchTerm}
                      activeDonorId={activeDonorId}
                      onActiveChange={setActiveDonorId}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Sort By</p>
                      <Select value={donorSortOption} onValueChange={setDonorSortOption}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sort donors" />
                        </SelectTrigger>
                        <SelectContent>
                          {DONOR_SORT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Filter by City</p>
                      <Select value={donorCityFilter} onValueChange={setDonorCityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Cities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cities</SelectItem>
                          {availableCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Filter by Interest</p>
                      <Select value={donorInterestFilter} onValueChange={setDonorInterestFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Interests" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Interests</SelectItem>
                          {availableInterests.map((interest) => (
                            <SelectItem key={interest} value={interest}>
                              {interest}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <DonorList
                    donors={donors}
                    isLoading={isDonorListLoading && donors.length === 0}
                    searchTerm={trimmedSearchTerm}
                    activeDonorId={activeDonorId}
                    onActiveChange={setActiveDonorId}
                    events={events}
                    inviteSelections={donorInviteSelections}
                    onInviteSelection={handleDonorInviteSelection}
                    onInviteDonor={handleInviteDonorToEvent}
                    canInvite={Boolean(canManageEvents)}
                  />
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-gray-500 text-right">
                      Showing {donors.length} of {donorTotal} donors
                    </p>
                    {donorHasMore && (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={handleLoadMoreDonors}
                          disabled={isDonorLoadingMore}
                        >
                          {isDonorLoadingMore ? 'Loading more donors...' : 'Load More Donors'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentPage === 'matching' && matchResults && (
          <div className="space-y-6">
            <div>
              <Button variant="outline" onClick={() => setCurrentPage('donors')} className="mb-4">
                Back to Donors
              </Button>
              <h2 className="text-2xl font-bold text-gray-900">Donor Matching Results</h2>
                <p className="text-gray-600">
                  Found {matchResults.totalMatches} matching donors
                  {selectedEventForMatching && ` for ${selectedEventForMatching.name}`}
                </p>
                {selectedEventForMatching && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <div className="sm:w-48">
                      <Label htmlFor="invite-count">Top donors to invite</Label>
                      <Input
                        id="invite-count"
                        type="number"
                        min={1}
                        max={maximumInviteCount}
                        value={matchInviteCount}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value)
                          if (Number.isNaN(nextValue)) {
                            setMatchInviteCount(1)
                            return
                          }
                          setMatchInviteCount(Math.max(1, Math.min(nextValue, maximumInviteCount)))
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Max {maximumInviteCount}
                        {selectedEventForMatching?.expectedAttendees
                          ? ' (expected attendees)'
                          : ''}
                      </p>
                    </div>
                    <Button
                      className="sm:self-start"
                      onClick={() => {
                        if (!matchResults.matches || matchResults.matches.length === 0) {
                          alert('No donor matches available to invite.')
                          return
                        }

                        const inviteLimit = Math.min(
                          matchInviteCount,
                          maximumInviteCount,
                          matchResults.matches.length,
                        )

                        if (inviteLimit <= 0) {
                          alert('Please choose at least one donor to invite.')
                          return
                        }

                        const topDonors = matchResults.matches.slice(0, inviteLimit)
                        const donorIds = topDonors.map((m) => m.donor.id)
                        const matchScores = {}
                        topDonors.forEach((m) => {
                          matchScores[m.donor.id] = m.score
                        })
                        handleAddDonorsToEvent(selectedEventForMatching.id, donorIds, matchScores)
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Invite Top {Math.min(matchInviteCount, maximumInviteCount)} Donors
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
              {matchResults.matches.slice(0, 20).map((match, index) => (
                <Card key={match.donor.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {index + 1}. {match.donor.firstName} {match.donor.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">{match.donor.email}</p>
                        <p className="text-xs text-gray-500">
                          {match.donor.city}, {match.donor.province}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{match.score.toFixed(1)}</div>
                        <div className="text-xs text-gray-500">Match score</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div>
                        <p className="font-medium text-gray-700">Score Breakdown</p>
                        <ul className="mt-1 space-y-1 text-xs text-gray-500">
                          <li>Interest alignment: {match.breakdown.interest}</li>
                          <li>Location: {match.breakdown.location}</li>
                          <li>Donation history: {match.breakdown.donation}</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Match Reasons</p>
                        <ul className="mt-1 space-y-1 text-xs text-gray-500">
                          {match.matchReasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentPage === 'events' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Events</h2>
                <p className="text-gray-600">Manage fundraising events</p>
              </div>
              {canManageEvents && (
                <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingEvent(null)
                        setShowEventDialog(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
                      <DialogDescription>
                        {editingEvent
                          ? 'Update event details below'
                          : 'Fill in the details to create a new fundraising event'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateEvent} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Event Name *</Label>
                        <Input id="name" name="name" defaultValue={editingEvent?.name || ''} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                          id="description"
                          name="description"
                          defaultValue={editingEvent?.description || ''}
                          required
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Internal Notes</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          defaultValue={editingEvent?.notes || ''}
                          placeholder="Key logistics, stakeholders, follow-ups..."
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="date">Event Date *</Label>
                          <Input
                            id="date"
                            name="date"
                            type="datetime-local"
                            defaultValue={
                              editingEvent?.date ? new Date(editingEvent.date).toISOString().slice(0, 16) : ''
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location">Location *</Label>
                          <select
                            id="location"
                            name="location"
                            defaultValue={editingEvent?.location || ''}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Select city</option>
                            {BC_CITIES.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eventType">Cancer Types (comma-separated) *</Label>
                        <Input
                          id="eventType"
                          name="eventType"
                          defaultValue={editingEvent?.eventType?.join(', ') || ''}
                          placeholder="e.g., Breast Cancer, Lung Cancer"
                          required
                        />
                        <p className="text-xs text-gray-500">Available: {CANCER_TYPES.join(', ')}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="targetAmount">Target Amount ($) *</Label>
                          <Input
                            id="targetAmount"
                            name="targetAmount"
                            type="number"
                            step="0.01"
                            defaultValue={editingEvent?.targetAmount ?? ''}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expectedAttendees">Expected Attendees *</Label>
                          <Input
                            id="expectedAttendees"
                            name="expectedAttendees"
                            type="number"
                            defaultValue={editingEvent?.expectedAttendees ?? ''}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                          id="status"
                          name="status"
                          defaultValue={editingEvent?.status || 'planned'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="draft">Draft</option>
                          <option value="planned">Planned</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowEventDialog(false)
                            setEditingEvent(null)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">{editingEvent ? 'Update Event' : 'Create Event'}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{event.name}</CardTitle>
                        <CardDescription>
                          {formatDate(event.date)} - {event.location}
                        </CardDescription>
                      </div>
                      {canManageEvents && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingEvent(event)
                              setShowEventDialog(true)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{event.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Target Amount:</span>
                        <span className="font-medium">{formatCurrency(event.targetAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expected Attendees:</span>
                        <span className="font-medium">{event.expectedAttendees}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <Badge
                          variant={EVENT_STATUS_BADGE_VARIANT[event.status] || 'secondary'}
                          className="capitalize"
                        >
                          {event.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {event.eventType.map((type, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                      {event.notes && (
                        <p className="text-xs text-gray-500 italic">
                          Notes: {event.notes.length > 120 ? `${event.notes.slice(0, 117)}...` : event.notes}
                        </p>
                      )}
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button className="w-full sm:w-auto" onClick={() => handleViewEventDetails(event)}>
                          View Event Details
                        </Button>
                        {canManageEvents && (
                          <Button
                            className="w-full sm:w-auto"
                            variant="outline"
                            onClick={() => handleEventMatching(event)}
                          >
                            <Filter className="w-4 h-4 mr-2" />
                            Find Matching Donors
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentPage === 'admin' && isAdmin && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Administration</h2>
              <p className="text-gray-600">Manage user access and system governance</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Directory</CardTitle>
                <CardDescription>Adjust roles and access levels for team members</CardDescription>
              </CardHeader>
              <CardContent>
                {isAdminLoading ? (
                  <div className="text-sm text-gray-500">Loading users...</div>
                ) : adminError ? (
                  <div className="text-sm text-red-600">{adminError}</div>
                ) : adminUsers.length === 0 ? (
                  <div className="text-sm text-gray-500">No users found.</div>
                ) : (
                  <div className="space-y-4">
                    {adminUsers.map((adminUser) => (
                      <div
                        key={adminUser.id}
                        className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{adminUser.username}</p>
                          <p className="text-sm text-gray-500">{adminUser.email}</p>
                          <p className="text-xs text-gray-400">
                            Last login:{' '}
                            {adminUser.lastLoginAt
                              ? new Date(adminUser.lastLoginAt).toLocaleString()
                              : 'Never'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                          <div className="min-w-[180px]">
                            <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Role</p>
                            <Select
                              value={adminUser.role}
                              onValueChange={(value) => handleUpdateUserRole(adminUser.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
                                Active
                              </p>
                              <Switch
                                checked={adminUser.isActive}
                                onCheckedChange={(checked) =>
                                  handleUpdateUserStatus(adminUser.id, checked)
                                }
                                aria-label={`Toggle active status for ${adminUser.username}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog
          open={auditDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseAuditDetail()
            } else {
              setAuditDialogOpen(true)
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Audit Log Entry</DialogTitle>
              <DialogDescription>
                {selectedAuditLog
                  ? `Recorded on ${new Date(selectedAuditLog.createdAt).toLocaleString()}`
                  : 'Audit event details'}
              </DialogDescription>
            </DialogHeader>
            {selectedAuditLog ? (
              <div className="space-y-4 text-sm text-gray-700">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Action</p>
                    <p className="font-medium text-gray-900">
                      {getAuditActionLabel(selectedAuditLog.action)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Entity</p>
                    <p className="font-medium text-gray-900">
                      {selectedAuditLog.entityType}
                      {selectedAuditLog.entityId != null ? ` #${selectedAuditLog.entityId}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Actor</p>
                    <p className="font-medium text-gray-900">
                      {selectedAuditLog.userId != null ? `User #${selectedAuditLog.userId}` : 'System'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">IP Address</p>
                    <p className="font-medium text-gray-900">{selectedAuditLog.ipAddress || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Payload</p>
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto text-xs leading-relaxed">
                    {JSON.stringify(selectedAuditLog.changes ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No audit detail available.</div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleCloseAuditDetail}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {currentPage === 'event-detail' && (
          <EventDetailView
            event={selectedEventDetail}
            isLoading={isEventDetailLoading}
            onBack={handleBackToEvents}
            onRemoveDonor={handleRemoveDonorFromEvent}
            canManageEvents={Boolean(canManageEvents)}
          />
        )}
      </main>
    </div>
  )
}

export default App

