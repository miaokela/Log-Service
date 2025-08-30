from django.urls import path
from . import views

urlpatterns = [
    path('write_log/', views.write_log_view, name='write_log'),
    path('batch_write_test/', views.batch_write_test_view, name='batch_write_test'),
    path('concurrent_test/', views.concurrent_test_view, name='concurrent_test'),
]
